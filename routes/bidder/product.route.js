const express = require('express');
const moment = require('moment');
var multer = require('multer');
const fs = require('fs');
const sleep = require('sleep');
const categoryModel = require('../../models/category.model');
const router = express.Router();


//
const restrict = require('../../middlewares/auth.mdw');
const bcrypt = require('bcryptjs');
const request = require('request');
const secretKey = "6LeQAMwUAAAAANC665bQZKP5KE-JUtd6UQdXcG-D";
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session')
//


router.post('/fav', async(req, res) => {
    let list_productTemp = {};

    const rows = await categoryModel.single_by_id('tblproduct', req.body.id);
    const tempUser = await categoryModel.single_by_id('tbluser', req.session.authUser.id);
    list_productTemp = JSON.parse(tempUser[0].list_product);
    // console.log('list product log:',list_productTemp);
    list_productTemp.push(rows[0].id);
    console.log(list_productTemp);
    let entity = { "list_product": JSON.stringify(list_productTemp) };
    let entityID = { "id": req.session.authUser.id };
    const update = await categoryModel.edit('tbluser', entity, entityID);
});

router.post('/del', async(req, res) => {
    console.log("id: ", req.body.id);
    //console.log("number: ",req.body.number);
    const rows = await categoryModel.single_by_id('tblproduct', req.body.id);
    var list_bidder = JSON.parse(rows[0].list_bidder);
    if (rows[0].list_deny == "") {
        rows[0].list_deny = '[]';
    }
    var list_deny = JSON.parse(rows[0].list_deny);
    for (let i = 0; i < list_bidder.length; i++) {
        if (list_bidder[i].number == req.body.number) {
            console.log("list_bidder i :", list_bidder[i])
            list_deny.push(list_bidder[i].id)
            list_bidder.splice(i, 1);
        }
    }

    //  entity = { list_bidder: JSON.stringify(listBidder) };
    //  result = await categoryModel.edit('tblproduct', entity, entityID);

    console.log("list_deny: ", JSON.stringify(list_deny));

    let entityId = {
        "id": req.body.id
    }
    let entity = {
        "list_bidder": JSON.stringify(list_bidder),
        "list_deny": JSON.stringify(list_deny)
    };
    const temp = await categoryModel.edit('tblproduct', entity, entityId);

    res.send({ success: true });
})
router.get('/list_bidding', async(req, res) => {
    const user = await categoryModel.single_by_id('tbluser', res.locals.authUser.id);
    let list_bidding = [];
    const rowsUser = await categoryModel.all('tbluser');
    const rows = await categoryModel.all("tblproduct");
    const rowscat = await categoryModel.all("tblcategory");
    for (let i = 0; i < rows.length; i++) {
        rows[i]["status"] = rows[i].is_active == 1 ? "Bình thường" : "Vô hiệu hóa";
        rows[i]["can_disable"] = rows[i].is_active == 1 ? true : false;
        for (let j = 0; j < rowscat.length; j++) {
            if (rowscat[j].id === rows[i].cat_id) {
                rows[i]['cat_name'] = rowscat[j].name;
                rows[i]["start_date_format"] = moment(rows[i].start_date).format('DD-MM-YYYY HH:mm:ss');
                rows[i]["end_date_format"] = moment(rows[i].end_date).format('DD-MM-YYYY HH:mm:ss');
                let listBidder = JSON.parse(rows[i].list_bidder);
                if (listBidder.length > 0) {
                    rows[i]["top_price"] = listBidder[listBidder.length - 1].price;
                    rows[i]["top_bidder"] = listBidder[listBidder.length - 1].id;
                } else {
                    rows[i]["top_price"] = rows[i].start_price;
                }
                break;
            }
        }
        for (let j = 0; j < rowsUser.length; j++) {
            if (rowsUser[j].id == rows[i].id_seller) {
                rows[i]['seller'] = rowsUser[j].name;
            }
        }
    }
    list_bidding = JSON.parse(user[0].list_product_bidding);
    for (let i = 0; i < list_bidding.length; i++) {
        for (let j = 0; j < rows.length; j++) {
            if (rows[j].id == list_bidding[i].id) {
                list_bidding[i]["seller"] = rows[j].seller;
                list_bidding[i]["cat_name"] = rows[j].cat_name;
                list_bidding[i]["name"] = rows[j].name;
                list_bidding[i]["top_price"] = rows[j].top_price;
                list_bidding[i]["start_date_format"] = rows[j].start_date_format;
                list_bidding[i]["end_date_format"] = rows[j].end_date_format;
                list_bidding[i]["min_increase"] = rows[j].min_increase;
                list_bidding[i]["day_bidder"] = moment(list_bidding[i].date).format('DD-MM-YYYY HH:mm:ss');
                if (user[0].id == rows[j].top_bidder) {
                    list_bidding[i]["top_bidder"] = true;
                }
                break;
            }
        }
    }

    res.render('bidder/list_product_bidding', {
        listProduct: list_bidding,
        empty: list_bidding.length === 0,
        layout: false
    });
})

router.get('/winner', async(req, res) => {
    if (!res.locals.isBidder) {
        return res.render('error_permission', { layout: false });
    }
    const userBidder = await categoryModel.single_by_id('tbluser', res.locals.authUser.id);
    let listProductWinner = JSON.parse(userBidder[0].list_product_winner);
    const rowscat = await categoryModel.all("tblcategory");
    const rowsUser = await categoryModel.all('tbluser');

    for (let i = 0; i < listProductWinner.length; i++) {
        let product = await categoryModel.single_by_id('tblproduct', listProductWinner[i].id);
        for (let j = 0; j < rowscat.length; j++) {
            if (rowscat[j].id === product[0].cat_id) {
                product[0]['cat_name'] = rowscat[j].name;
                product[0]["start_date_format"] = moment(product[0].start_date).format('DD-MM-YYYY HH:mm:ss');
                product[0]["end_date_format"] = moment(product[0].end_date).format('DD-MM-YYYY HH:mm:ss');
                let listBidder = JSON.parse(product[0].list_bidder);
                let minPriceIndex = 0;
                for (let l = 0; l < listBidder.length - 1; l++) {
                    minPriceIndex = l;
                    for (let k = l + 1; k < listBidder.length; k++) {
                        if (listBidder[k].price < listBidder[minPriceIndex].price) {
                            let temp = {...listBidder[minPriceIndex] };
                            listBidder[minPriceIndex] = {...listBidder[k] };
                            listBidder[k] = {...temp };
                        } else if (listBidder[k].price == listBidder[minPriceIndex].price) {
                            if (listBidder[k].date > listBidder[minPriceIndex].date) {
                                let temp = {...listBidder[minPriceIndex] };
                                listBidder[minPriceIndex] = {...listBidder[k] };
                                listBidder[k] = {...temp };
                            }
                        }
                    }
                }
                for (let l = 0; l < rowsUser.length; l++) {
                    if (rowsUser[l].id == product[0].id_seller) {
                        product[0]["seller"] = rowsUser[l].name;
                        let point = JSON.parse(rowsUser[l].point);
                        product[0]["seller_point"] = point[0].seller;
                        break;
                    }
                }
                if (listBidder.length > 0) {
                    product[0]["top_price"] = listBidder[listBidder.length - 1].price;
                    product[0]["date_bid"] = moment(listBidder[listBidder.length - 1].date).format('DD-MM-YYYY HH:mm:ss');
                } else {
                    product[0]["top_price"] = product[0].start_price;
                    product[0]["date_bid"] = "Không lượt đấu giá";
                }
                break;
            }
        }
        listProductWinner[i]["name"] = product[0].name;
        listProductWinner[i]["cat_name"] = product[0].cat_name;
        listProductWinner[i]["start_date_format"] = product[0].start_date_format;
        listProductWinner[i]["end_date_format"] = product[0].end_date_format;
        listProductWinner[i]["top_price"] = product[0].top_price;
        listProductWinner[i]["seller"] = product[0].seller;
        listProductWinner[i]["seller_point"] = product[0].seller_point;
        listProductWinner[i]["date_bid"] = product[0].date_bid;
        console.log(listProductWinner);
        if (listProductWinner[i].isFeedback == 1) {
            listProductWinner[i]["feed_back"] = "Đã thích";
            listProductWinner[i]["can_feed_back"] = false;
        } else if (listProductWinner[i].isFeedback == 0) {
            listProductWinner[i]["feed_back"] = "Đã ghét";
            listProductWinner[i]["can_feed_back"] = false;
        } else {
            listProductWinner[i]["feed_back"] = "Chưa đánh giá";
            listProductWinner[i]["can_feed_back"] = true;
        }

    }

    // let offsetGMT = +7;
    // let today = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);
    // console.log(today);

    // for (let i = 0; i < rows.length; i++) {
    //     rows[i]["status"] = rows[i].is_active == 1 ? "Bình thường" : "Vô hiệu hóa";
    //     rows[i]["can_disable"] = rows[i].is_active == 1 ? true : false;
    //     for (let j = 0; j < rowscat.length; j++) {
    //         if (rowscat[j].id === rows[i].cat_id) {
    //             rows[i]['cat_name'] = rowscat[j].name;
    //             rows[i]["start_date_format"] = moment(rows[i].start_date).format('DD-MM-YYYY HH:mm:ss');
    //             rows[i]["end_date_format"] = moment(rows[i].end_date).format('DD-MM-YYYY HH:mm:ss');
    //             let listBidder = JSON.parse(rows[i].list_bidder);
    //             if (listBidder.length > 0) {
    //                 rows[i]["top_price"] = listBidder[listBidder.length - 1].price;
    //                 rows[i]["winner"] = listBidder[listBidder.length - 1].name;
    //             } else {
    //                 rows[i]["top_price"] = rows[i].start_price;
    //                 rows[i]["winner"] = "Không ai";
    //             }
    //             break;
    //         }
    //     }
    //     for (let j = 0; j < rowsUser.length; j++) {
    //         if (rowsUser[j].id == rows[i].id_seller) {
    //             rows[i]['seller'] = rowsUser[j].name;
    //         }
    //     }
    // }

    // let result = [];
    // for (let i = 0; i < rows.length; i++) {
    //     if (rows[i].end_date < today) {
    //         result.push(rows[i]);
    //     }
    // }
    res.render('bidder/list_product_winner', {
        listProduct: listProductWinner,
        user: userBidder[0],
        empty: listProductWinner.length === 0,
        layout: false
    });

})


router.post('/Payment', async(req, res) => {
    let entityId = { id: req.session.authUser.id };
    const user = await categoryModel.single_by_id('tbluser', req.session.authUser.id);

    const entity = {
        "name": req.body.name,
        "phone": req.body.phone,
        "address": req.body.address,
        "email": req.body.email,
        "role": user[0].role,
        "point": user[0].point,
        "is_active": 1
    };
    try {
        const edit = await categoryModel.edit("tbluser", entity, entityId);
        console.log(edit);
    } catch (err) {
        console.log(err);
    }

    res.redirect('/')
});




//

router.post('/feedBack', async(req, res) => {
    let id = req.body.id;
    const product = await categoryModel.single_by_id('tblproduct', id);
    let id_seller = product[0].id_seller;
    let seller = await categoryModel.single_by_id('tbluser', id_seller);
    let listProductSelled = JSON.parse(seller[0].list_product_selled);

    for (let i = 0; i < listProductSelled.length; i++) {
        if (listProductSelled[i].id == id) {
            listProductSelled[i].status = req.body.status;
            listProductSelled[i].comment = req.body.comment;
        }
    }

    let point = JSON.parse(seller[0].point);
    let like = parseInt(point[0].seller.substring(0, point[0].seller.indexOf("-")));
    let disLike = parseInt(point[0].seller.substring(point[0].seller.indexOf("-") + 1));
    if (req.body.status == 1) {
        like += 1;
        point[0].seller = "" + like + "-" + disLike;
    } else if (req.body.status == 0) {
        disLike += 1;
        point[0].seller = "" + like + "-" + disLike;
    }

    let entity = { list_product_selled: JSON.stringify(listProductSelled), point: JSON.stringify(point) };
    let entityID = { id: id_seller };
    categoryModel.edit('tbluser', entity, entityID);

    let idFeedbacker = res.locals.authUser.id;
    let userFeedback = await categoryModel.single_by_id('tbluser', idFeedbacker);
    let listProductWinner = JSON.parse(userFeedback[0].list_product_winner);
    for (let i = 0; i < listProductWinner.length; i++) {
        if (listProductWinner[i].id == id) {
            listProductWinner[i].isFeedback = req.body.status;
        }
    }
    entityID = { id: idFeedbacker };
    entity = { list_product_winner: JSON.stringify(listProductWinner) };
    categoryModel.edit('tbluser', entity, entityID);
    sleep.msleep(200);
    res.send({ success: true });
})

router.get('/fav', async(req, res) => {
    var idProducts = JSON.parse(req.session.authUser.list_product);
    const rows = [];
    idProducts.forEach(async(element) => {
        console.log("id product: ", element);
        var tempProduct = await categoryModel.single_by_id("tblproduct", element);
        console.log(" product: ", tempProduct[0]);
        rows.push(tempProduct[0])
    });
    // console.log("log row page fav get :", rows);

    const rowscat = await categoryModel.all("tblcategory");
    const rowsUser = await categoryModel.all('tbluser');

    for (let i = 0; i < rows.length; i++) {


        rows[i]["status"] = rows[i].is_active == 1 ? "Bình thường" : "Vô hiệu hóa";
        rows[i]["can_disable"] = rows[i].is_active == 1 ? true : false;
        for (let j = 0; j < rowscat.length; j++) {
            if (rowscat[j].id === rows[i].cat_id) {
                rows[i]['cat_name'] = rowscat[j].name;
                rows[i]["start_date_format"] = moment(rows[i].start_date).format('DD-MM-YYYY HH:mm:ss');
                rows[i]["end_date_format"] = moment(rows[i].end_date).format('DD-MM-YYYY HH:mm:ss');
                let listBidder = JSON.parse(rows[i].list_bidder);
                if (listBidder.length > 0) {
                    rows[i]["top_price"] = listBidder[listBidder.length - 1].price;
                } else {
                    rows[i]["top_price"] = rows[i].start_price;
                }
                break;
            }
        }
        for (let j = 0; j < rowsUser.length; j++) {
            if (rowsUser[j].id == rows[i].id_seller) {
                rows[i]['seller'] = rowsUser[j].name;
            }
        }
    }

    res.render('bidder/favouriteProducts', {
        listProduct: rows,
        empty: rows.length === 0,
        layout: false
    });

});

router.post('/bid_product', async(req, res) => {
    const product = await categoryModel.single_by_id('tblproduct', req.body.id);
    const user = await categoryModel.single_by_id('tbluser', res.locals.authUser.id);

    let listProductBidding = JSON.parse(user[0].list_product_bidding) || [];
    let productItem = {};
    productItem["id"] = product[0].id;
    productItem["price"] = parseInt(req.body.price);

    let offsetGMT = 0;
    let today = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);
    var current_date = today.getFullYear()+"-"+(today.getMonth()+1)+"-"+ today.getDate()+" "+today.getHours()+":"+today.getMinutes()+":"+ today.getSeconds();
    console.log("current_date: ", current_date);
    productItem["date"] = current_date;
    listProductBidding.push(productItem);

    let entityID = { id: user[0].id };
    let entity = { list_product_bidding: JSON.stringify(listProductBidding) };

    let result = await categoryModel.edit('tbluser', entity, entityID);

    let listBidder = JSON.parse(product[0].list_bidder);
    let bidderItem = {};
    bidderItem["number"] = listBidder.length;
    bidderItem["id"] = user[0].id;
    bidderItem["name"] = user[0].name;
    bidderItem["date"] = current_date;
    bidderItem["price"] = parseInt(req.body.price);
    let point = JSON.parse(user[0].point);
    productItem["point"] = point[0].bidder;
    listBidder.push(bidderItem);

    entityID = { id: product[0].id };
    entity = { list_bidder: JSON.stringify(listBidder) };
    result = await categoryModel.edit('tblproduct', entity, entityID);

    res.send({ success: true });
})

router.post('/buy_product_now', async(req, res) => {
    const product = await categoryModel.single_by_id('tblproduct', req.body.id);
    const user = await categoryModel.single_by_id('tbluser', res.locals.authUser.id);

    let listProductWinner = JSON.parse(user[0].list_product_winner) || [];
    let productItem = {};
    productItem["id"] = product[0].id;
    productItem["price"] = parseInt(req.body.price);

    let offsetGMT = 0;
    let today = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);
    var current_date = today.getFullYear()+"-"+(today.getMonth()+1)+"-"+ today.getDate()+" "+today.getHours()+":"+today.getMinutes()+":"+ today.getSeconds();
    productItem["date"] = current_date;
    listProductWinner.push(productItem);

    let entityID = { id: user[0].id };
    let entity = { list_product_winner: JSON.stringify(listProductWinner) };

    let result = await categoryModel.edit('tbluser', entity, entityID);

    entityID = { id: product[0].id };
    entity = {end_date: current_date};
    result = await categoryModel.edit('tblproduct', entity, entityID);

    let listBidder = JSON.parse(product[0].list_bidder);
    let bidderItem = {};
    bidderItem["number"] = listBidder.length;
    bidderItem["id"] = user[0].id;
    bidderItem["name"] = user[0].name;
    bidderItem["date"] = today;
    bidderItem["price"] = parseInt(req.body.price);
    let point = JSON.parse(user[0].point);
    productItem["point"] = point[0].bidder;
    listBidder.push(bidderItem);

    entityID = { id: product[0].id };
    entity = { list_bidder: JSON.stringify(listBidder) };
    result = await categoryModel.edit('tblproduct', entity, entityID);
    entity = { is_active: 0 };
    result = await categoryModel.edit('tblproduct', entity, entityID);
    entity = { is_expired: 1 };
    result = await categoryModel.edit('tblproduct', entity, entityID);

    res.send({ success: true });
})

module.exports = router;