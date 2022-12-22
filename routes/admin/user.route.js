var express = require('express');
const categoryModel = require('../../models/category.model');

const router = express.Router();

router.get('/', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    const rows = await categoryModel.all("tbluser");
    for (let i = 0; i < rows.length; i++) {
        let listRole = JSON.parse(rows[i].role);
        rows[i]["role_name"] = "";
        for (let j = 0; j < listRole.length; j++) {
            switch (listRole[j]) {
                case 1:
                    rows[i]["role_name"] += "Quản trị viên";
                    break;
                case 2:
                    rows[i]["role_name"] += "Người bán";
                    break;
                case 3:
                    rows[i]["role_name"] += "Người Đấu giá";
                    break;
            }
            if (j != listRole.length - 1) {
                rows[i]["role_name"] += ", ";
            }
        }
        rows[i]["status"] = rows[i].is_active == 1 ? "Bình thường" : "Vô hiệu hóa";
    }
    res.render('admin/list_user', {
        listUser: rows,
        empty: rows.length === 0,
        layout: false
    });
})

router.get('/get_user/:id', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    try {
        const rows = await categoryModel.single_by_id("tbluser", req.params.id);
        res.send(rows[0]);

    } catch (err) {
        console.log(err);
        //     res.end('View error log in console.');
    }
})




router.get('/get_userrole', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    try {
        const rows = await categoryModel.all("tblrole");
        res.send(rows);

    } catch (err) {
        console.log(err);
        //     res.end('View error log in console.');
    }
})

router.get('/get_userstatus', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    try {
        const rows = await categoryModel.all("tblstatus");
        res.send(rows);

    } catch (err) {
        console.log(err);
        //     res.end('View error log in console.');
    }
})

router.post('/edit', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    let entityId = {
        "id": parseInt(req.body.user_id)
    }
    console.log(req.body);
    let json = "";
    if (Array.isArray(req.body.role)) {
        let listRole = [];
        for (let i = 0; i < req.body.role.length; i++) {
            listRole.push(parseInt(req.body.role[i]));
        }
        json = JSON.stringify(listRole);
    } else{
        json = JSON.stringify([req.body.role != null ?  parseInt(req.body.role) : '']);
    }
    let entity = {
        "is_approve_seller": false,
        "role": json,
        "is_active": parseInt(req.body.user_status)
    }
    console.log(entity);
    console.log(entityId);
    const data = await categoryModel.edit("tbluser", entity, entityId);
    res.redirect('/admin/user');
});

router.post('/delete', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    let entityId = {
        "id": req.body.id
    }
    const data = await categoryModel.del("tbluser", entityId);
    res.redirect('/admin/user');
});

//edit_for_Payment
router.get('/edit_for_Payment', async(req, res) => {
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


router.post('/edit_for_Payment', async(req, res) => {
    let entityId = { id: req.session.authUser.id };
    const user = await categoryModel.single_by_id('tbluser', req.session.authUser.id);

    const entity = {
        "name": req.body.user_name,
        "phone": req.body.user_phone,
        "address": req.body.user_address,
        "email": req.body.user_email,
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

    res.redirect('/account/profile')
});




module.exports = router;