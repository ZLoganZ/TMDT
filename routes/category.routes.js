var express = require('express');
var moment = require('moment');
const categoryModel = require('../models/category.model');
const config = require('../config/default.json')

const router = express.Router();

router.get('/:id/products', async(req, res) => {
    const limit = config.paginate.limit;
    const id = req.params.id;

    const page = req.query.page || 1;
    const sortOrder = req.query.sortOrder || 1;
    const sortFillter = req.query.sortFillter || 1;
    const offset = (page - 1) * limit;
    let disable_prev = false;
    let disable_next = false;
    let isIncrease = true;
    let isSortdate = true;
    if (page < 1) {
        page = 1;
    }

    const [total, rows] = await Promise.all([
        categoryModel.count_product_by_cat('tblproduct', id),
        categoryModel.all_product_by_cat('tblproduct', id)
    ]);

    const cat = await categoryModel.single_by_id('tblcategory', id);
    let offsetGMT = 0;
    let dt = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);

    if (rows.length == 0) {
        const catRows = await categoryModel.single_by_id('tblcategory', id);
        if (catRows[0].level == 2) {
            const subCats = await categoryModel.all_by_pid('tblcategory', id);
            let result = [];
            for (let i = 0; i < subCats.length; i++) {
                let product = await categoryModel.all_product_by_cat('tblproduct', subCats[i].id);
                result.push.apply(result, product);
            }

            let nPage = Math.floor(result.length / limit);
            if (result.length % limit > 0) {
                nPage++;
            }
            let page_numbers = [];
            for (let i = 1; i <= nPage; i++) {
                page_numbers.push({
                    "value": i,
                    isCurrentPage: i === +page
                })
            }
            if (page == 1) {
                disable_prev = true;
            }
            if (page == page_numbers.length) {
                disable_next = true;
            }
            for (let i = 0; i < result.length; i++) {
                let list_bidder_json = result[i]["list_bidder"];
                let list_bidder_object = JSON.parse(list_bidder_json);
                let minPriceIndex = 0;
                for (let j = 0; j < list_bidder_object.length - 1; j++) {
                    minPriceIndex = j;
                    for (let k = j + 1; k < list_bidder_object.length; k++) {
                        if (list_bidder_object[k].price < list_bidder_object[minPriceIndex].price) {
                            let temp = {...list_bidder_object[minPriceIndex] };
                            list_bidder_object[minPriceIndex] = {...list_bidder_object[k] };
                            list_bidder_object[k] = {...temp };
                        } else if (list_bidder_object[k].price == list_bidder_object[minPriceIndex].price) {
                            if (list_bidder_object[k].date > list_bidder_object[minPriceIndex].date) {
                                let temp = {...list_bidder_object[minPriceIndex] };
                                list_bidder_object[minPriceIndex] = {...list_bidder_object[k] };
                                list_bidder_object[k] = {...temp };
                            }
                        }
                    }
                }

                let bidder_name = "";
                if (list_bidder_object.length > 0) {
                    let topBidder = await categoryModel.single_by_id('tbluser', list_bidder_object[list_bidder_object.length - 1].id);
                    bidder_name = topBidder[0].name;
                    bidder_name = bidder_name.substring(bidder_name.lastIndexOf(" ") + 1);
                    top_price = list_bidder_object[list_bidder_object.length - 1].price;
                    bidder_name = "****" + bidder_name;
                    result[i]["bidder"] = bidder_name;
                    result[i]["top_price"] = top_price;
                    result[i]["count_bid"] = list_bidder_object.length + " lượt";
                } else {
                    result[i]["bidder"] = "Chưa có người ra giá";
                    result[i]["top_price"] = result[i].start_price;
                    result[i]["count_bid"] = "0 lượt";
                }
                let difference_in_time = result[i].end_date.getTime() - dt.getTime();
                let difference_in_date = difference_in_time / (1000 * 3600 * 24);
                if (difference_in_date >= 1 && difference_in_date < 4) {
                    result[i]["date_time"] = "" + parseInt(difference_in_date) + " ngày nữa";
                } else if (difference_in_date < 1 && difference_in_time > 0) {
                    let difference_in_hour = difference_in_time / (1000 * 3600);
                    if (difference_in_hour < 1) {
                        let difference_in_minute = difference_in_time / (1000 * 60);
                        if (difference_in_minute < 1) {
                            result[i]["date_time"] = "" + parseInt(difference_in_time / (1000)) + " giây nữa";
                        } else {
                            result[i]["date_time"] = "" + parseInt(difference_in_minute) + " phút nữa";
                        }
                    } else {
                        result[i]["date_time"] = "" + parseInt(difference_in_hour) + " giờ nữa";
                    }
                } else {
                    result[i]["date_time"] = moment(result[i].end_date).format('DD-MM-YYYY HH:mm:ss');
                }

                let isNew = false;
                difference_in_time = dt.getTime() - result[i].start_date;
                let difference_in_minute_start_date = difference_in_time / (1000 * 60);
                if (difference_in_minute_start_date < 60) {
                    result[i]["is_new"] = true;
                }
            }

            if (sortFillter == 1) {
                if (sortOrder == 1) {
                    sortDateInrease(result);
                } else {
                    isIncrease = false;
                    sortDateDecrease(result);
                }
            } else {
                if (sortOrder == 1) {
                    sortPriceIncrease(result);
                } else {
                    isIncrease = false
                    sortPriceDecrease(result);
                }
                isSortdate = false;
            }

            let rowsCombine = result.slice(offset, offset + limit);

            res.render('products/allByCat', {
                products: rowsCombine,
                empty: rowsCombine.length === 0,
                page_numbers,
                prev_value: +page - 1,
                next_value: +page + 1,
                disable_prev,
                disable_next,
                sortOrder,
                sortFillter,
                isIncrease,
                isSortdate,
                catName: cat[0].name
            });
        }
        // else {
        //     let nPage = Math.floor(total / limit);
        //     if (total % limit > 0) {
        //         nPage++;
        //     }
        //     let page_numbers = [];
        //     for (let i = 1; i <= nPage; i++) {
        //         page_numbers.push({
        //             "value": i,
        //             isCurrentPage: i === +page
        //         })
        //     }
        //     if (page == 1) {
        //         disable_prev = true;
        //     }
        //     if (page == page_numbers.length) {
        //         disable_next = true;
        //     }

        //     for (let i = 0; i < rows.length; i++) {
        //         let list_bidder_json = rows[i]["list_bidder"];
        //         let list_bidder_object = JSON.parse(list_bidder_json);
        //         let minPriceIndex = 0;
        //         for (let j = 0; j < list_bidder_object.length - 1; j++) {
        //             minPriceIndex = j;
        //             for (let k = j + 1; k < list_bidder_object.length; k++) {
        //                 if (list_bidder_object[k].price < list_bidder_object[minPriceIndex].price) {
        //                     let temp = {...list_bidder_object[minPriceIndex] };
        //                     list_bidder_object[minPriceIndex] = {...list_bidder_object[k] };
        //                     list_bidder_object[k] = {...temp };
        //                 } else if (list_bidder_object[k].price == list_bidder_object[minPriceIndex].price) {
        //                     if (list_bidder_object[k].date > list_bidder_object[minPriceIndex].date) {
        //                         let temp = {...list_bidder_object[minPriceIndex] };
        //                         list_bidder_object[minPriceIndex] = {...list_bidder_object[k] };
        //                         list_bidder_object[k] = {...temp };
        //                     }
        //                 }
        //             }
        //         }
        //         let bidder_name = "";
        //         bidder_name = list_bidder_object[list_bidder_object.length - 1].name;
        //         bidder_name = bidder_name.substring(bidder_name.lastIndexOf(" ") + 1);
        //         top_price = list_bidder_object[list_bidder_object.length - 1].price;
        //         bidder_name = "****" + bidder_name;
        //         rows[i]["bidder"] = bidder_name;
        //         rows[i]["top_price"] = top_price;
        //         rows[i]["count_bid"] = list_bidder_object.length + " lượt";
        //         let difference_in_time = rows[i].end_date.getTime() - dt.getTime();
        //         let difference_in_date = difference_in_time / (1000 * 3600 * 24);
        //         if (difference_in_date >= 1 && difference_in_date < 4) {
        //             rows[i]["date_time"] = "" + parseInt(difference_in_date) + " ngày nữa";
        //         } else if (difference_in_date < 1) {
        //             let difference_in_hour = difference_in_time / (1000 * 3600);
        //             if (difference_in_hour < 1) {
        //                 let difference_in_minute = difference_in_time / (1000 * 60);
        //                 if (difference_in_minute < 1) {
        //                     rows[i]["date_time"] = "" + parseInt(difference_in_time / (1000)) + " giây nữa";
        //                 } else {
        //                     rows[i]["date_time"] = "" + parseInt(difference_in_minute) + " phút nữa";
        //                 }
        //             } else {
        //                 rows[i]["date_time"] = "" + parseInt(difference_in_hour) + " giờ nữa";
        //             }
        //         } else {
        //             rows[i]["date_time"] = moment(rows[i].end_date).format('DD-MM-YYYY HH:mm:ss');
        //         }
        //     }
        //     // console.log(rows);
        //     res.render('products/allByCat', {
        //         products: rows,
        //         empty: rows.length === 0,
        //         page_numbers,
        //         prev_value: +page - 1,
        //         next_value: +page + 1,
        //         disable_prev,
        //         disable_next
        //     });
        // }
    } else {
        let nPage = Math.floor(total / limit);
        if (total % limit > 0) {
            nPage++;
        }
        let page_numbers = [];
        for (let i = 1; i <= nPage; i++) {
            page_numbers.push({
                "value": i,
                isCurrentPage: i === +page
            })
        }
        if (page == 1) {
            disable_prev = true;
        }
        if (page == page_numbers.length) {
            disable_next = true;
        }
        for (let i = 0; i < rows.length; i++) {
            let list_bidder_json = rows[i]["list_bidder"];
            let list_bidder_object = JSON.parse(list_bidder_json);
            let minPriceIndex = 0;
            for (let j = 0; j < list_bidder_object.length - 1; j++) {
                minPriceIndex = j;
                for (let k = j + 1; k < list_bidder_object.length; k++) {
                    if (list_bidder_object[k].price < list_bidder_object[minPriceIndex].price) {
                        let temp = {...list_bidder_object[minPriceIndex] };
                        list_bidder_object[minPriceIndex] = {...list_bidder_object[k] };
                        list_bidder_object[k] = {...temp };
                    } else if (list_bidder_object[k].price == list_bidder_object[minPriceIndex].price) {
                        if (list_bidder_object[k].date > list_bidder_object[minPriceIndex].date) {
                            let temp = {...list_bidder_object[minPriceIndex] };
                            list_bidder_object[minPriceIndex] = {...list_bidder_object[k] };
                            list_bidder_object[k] = {...temp };
                        }
                    }
                }
            }
            //console.log('ok',list_bidder_object);
            //console.log('ok', rows)
            let bidder_name = "";
            if(list_bidder_object.length > 0){
                const getBidderName = await categoryModel.single_by_id('tbluser', list_bidder_object[list_bidder_object?.length - 1]?.id);
                //bidder_name = list_bidder_object[list_bidder_object.length - 1].name;
                bidder_name = getBidderName[0].name;
                bidder_name = bidder_name.substring(bidder_name.lastIndexOf(" ") + 1);
                top_price = list_bidder_object[list_bidder_object.length - 1].price;
                bidder_name = "****" + bidder_name;
                // console.log(rows[i].end_date);
                rows[i]["bidder"] = bidder_name;
                rows[i]["top_price"] = top_price;
                rows[i]["count_bid"] = list_bidder_object.length + " lượt";}
            else{
                rows[i]["bidder"] = "Chưa có ai đấu giá";
                rows[i]["top_price"] = rows[i].start_price;
                rows[i]["count_bid"] = "0 lượt";
            }
            let difference_in_time = rows[i].end_date.getTime() - dt.getTime();
            let difference_in_date = difference_in_time / (1000 * 3600 * 24);
            if (difference_in_date >= 1 && difference_in_date < 4) {
                rows[i]["date_time"] = "" + parseInt(difference_in_date) + " ngày nữa";
            } else if (difference_in_date < 1 && difference_in_time > 0) {
                let difference_in_hour = difference_in_time / (1000 * 3600);
                if (difference_in_hour < 1) {
                    let difference_in_minute = difference_in_time / (1000 * 60);
                    if (difference_in_minute < 1) {
                        rows[i]["date_time"] = "" + parseInt(difference_in_time / (1000)) + " giây nữa";
                    } else {
                        rows[i]["date_time"] = "" + parseInt(difference_in_minute) + " phút nữa";
                    }
                } else {
                    rows[i]["date_time"] = "" + parseInt(difference_in_hour) + " giờ nữa";
                }
            } else {
                rows[i]["date_time"] = moment(rows[i].end_date).format('DD-MM-YYYY HH:mm:ss');
            }

            let isNew = false;
            difference_in_time = dt.getTime() - rows[i].start_date;
            let difference_in_minute_start_date = difference_in_time / (1000 * 60);
            if (difference_in_minute_start_date < 60) {
                rows[i]["is_new"] = true;
            }
        }

        if (sortFillter == 1) {
            if (sortOrder == 1) {
                sortDateInrease(rows);
            } else {
                isIncrease = false;
                sortDateDecrease(rows);
            }
        } else {
            if (sortOrder == 1) {
                sortPriceIncrease(rows);
            } else {
                isIncrease = false
                sortPriceDecrease(rows);
            }
            isSortdate = false;
        }
        let result = rows.slice(offset, offset + limit);

        res.render('products/allByCat', {
            products: result,
            empty: result.length === 0,
            page_numbers,
            prev_value: +page - 1,
            next_value: +page + 1,
            disable_prev,
            disable_next,
            sortOrder,
            sortFillter,
            isIncrease,
            isSortdate,
            catName: cat[0].name
        });
    }
});

function sortDateInrease(listItem) {
    let index = 0;
    for (let i = 0; i < listItem.length - 1; i++) {
        index = i;
        for (let j = i + 1; j < listItem.length; j++) {
            if (listItem[j].end_date < listItem[index].end_date) {
                let temp = {...listItem[index] };
                listItem[index] = {...listItem[j] };
                listItem[j] = {...temp };
            }
        }
    }
}

function sortDateDecrease(listItem) {
    let index = 0;
    for (let i = 0; i < listItem.length - 1; i++) {
        index = i;
        for (let j = i + 1; j < listItem.length; j++) {
            if (listItem[j].end_date > listItem[index].end_date) {
                let temp = {...listItem[index] };
                listItem[index] = {...listItem[j] };
                listItem[j] = {...temp };
            }
        }
    }
}


function sortPriceIncrease(listItem) {
    let index = 0;
    for (let i = 0; i < listItem.length - 1; i++) {
        index = i;
        for (let j = i + 1; j < listItem.length; j++) {
            if (listItem[j].top_price < listItem[index].top_price) {
                let temp = {...listItem[index] };
                listItem[index] = {...listItem[j] };
                listItem[j] = {...temp };
            }
        }
    }
}

function sortPriceDecrease(listItem) {
    let index = 0;
    for (let i = 0; i < listItem.length - 1; i++) {
        index = i;
        for (let j = i + 1; j < listItem.length; j++) {
            if (listItem[j].top_price > listItem[index].top_price) {
                let temp = {...listItem[index] };
                listItem[index] = {...listItem[j] };
                listItem[j] = {...temp };
            }
        }
    }
}

router.get('/products/:id', async(req, res) => {
    const rows = await categoryModel.single_by_id('tblproduct', req.params.id);
    const product = rows[0];
    const rowsUser = await categoryModel.single_by_id('tbluser', product.id_seller);
    let isOwnProduct = false;
    product["seller_name"] = rowsUser[0].name;
    product["seller_id"] = rowsUser[0].id;
    //console.log("rowsUser[0].id: ", rowsUser[0].id)
    product["seller_phone"] = rowsUser[0].phone;
    product["seller_email"] = rowsUser[0].email;
    let point = JSON.parse(rowsUser[0].point);
    let like = parseInt(point[0].seller.substring(0, point[0].seller.indexOf("-")));
    let disLike = parseInt(point[0].seller.substring(point[0].seller.indexOf("-") + 1));
    let offsetGMT = 0;
    let dt = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);
    product["seller_point"] = like / (disLike + like) * 100;
    if (like + disLike == 0) {
        product["seller_point"] = 100;
    }

    if (like / (like + disLike) > 0.8 || like + disLike == 0) {
        product["react_haha"] = true;
    } else {
        product["react_haha"] = false;
    }
    product["start_date_format"] = moment(product.start_date).format('DD-MM-YYYY HH:mm:ss');
    let difference_in_time = product.end_date.getTime() - dt.getTime();
    let difference_in_date = difference_in_time / (1000 * 3600 * 24);
    if (difference_in_date >= 1 && difference_in_date < 4) {
        product["end_date_format"] = "" + parseInt(difference_in_date) + " ngày nữa";
    } else if (difference_in_date < 1 && difference_in_date > 0) {
        let difference_in_hour = difference_in_time / (1000 * 3600);
        if (difference_in_hour < 1) {
            let difference_in_minute = difference_in_time / (1000 * 60);
            if (difference_in_minute < 1) {
                product["end_date_format"] = "" + parseInt(difference_in_time / (1000)) + " giây nữa";
            } else {
                product["end_date_format"] = "" + parseInt(difference_in_minute) + " phút nữa";
            }
        } else {
            product["end_date_format"] = "" + parseInt(difference_in_hour) + " giờ nữa";
        }
    } else {
        product["end_date_format"] = moment(product.end_date).format('DD-MM-YYYY HH:mm:ss');
    }
    listBidder1 = JSON.parse(product.list_bidder);
    product["list_bidder_object"] = [...listBidder1];

    let minPriceIndex = 0;
    for (let j = 0; j < listBidder1.length - 1; j++) {
        minPriceIndex = j;
        for (let k = j + 1; k < listBidder1.length; k++) {
            if (listBidder1[k].price < listBidder1[minPriceIndex].price) {
                let temp = {...listBidder1[minPriceIndex] };
                listBidder1[minPriceIndex] = {...listBidder1[k] };
                listBidder1[k] = {...temp };
            } else if (listBidder1[k].price == listBidder1[minPriceIndex].price) {
                if (listBidder1[k].date > listBidder1[minPriceIndex].date) {
                    let temp = {...listBidder1[minPriceIndex] };
                    listBidder1[minPriceIndex] = {...listBidder1[k] };
                    listBidder1[k] = {...temp };
                }
            }
        }
    }

    for (let i = 0; i < product.list_bidder_object.length; i++) {
        let Bidder_of_Product = await categoryModel.single_by_id('tbluser', product.list_bidder_object[i].id);
        //console.log(product);
        var bidderPoint = JSON.parse(Bidder_of_Product[0].point);
        like = parseInt(bidderPoint[0].bidder.substring(0, bidderPoint[0].bidder.indexOf("-")));
        disLike = parseInt(bidderPoint[0].bidder.substring(bidderPoint[0].bidder.indexOf("-") + 1));
        var bidder = like + disLike;
        var count_like = 0;
        if (bidder == 0) {
            count_like = 100;

        }
        if (bidder > 0) {
            count_like = Math.ceil(like / bidder * 100);

        }
        product.list_bidder_object[i].point = count_like;
        product.list_bidder_object[i].date = moment(product.list_bidder_object[i].date).format('DD-MM-YYYY HH:mm:ss');
        product.list_bidder_object[i].name = "****" + Bidder_of_Product[0].name.substring(Bidder_of_Product[0].name.lastIndexOf(" ") + 1);;
        product.list_bidder_object[i].is_seller = false;
        product.list_bidder_object[i].is_not_seller = false;
        if (res.locals.isAuthenticated && res.locals.authUser.id == product.id_seller) {
            product.list_bidder_object[i].is_seller = true;
        } else {
            product.list_bidder_object[i].is_not_seller = true;
        }
        product.list_bidder_object[i].curProductID = req.params.id;
        product.list_bidder_object[i].BidderID = Bidder_of_Product[0].id;
    }
    //console.log(listBidder1);

    if (listBidder1.length == 0) {
        product["top_bidder"] = "Chưa ai ra giá"
        product["bidder_point"] = 0;
        product["bidder_react_haha"] = true;
        product["top_price"] = 0;
        product["recommend_price"] = parseInt(product["start_price"]);
    } else {
        let bidder_user = await categoryModel.single_by_id('tbluser', listBidder1[listBidder1.length - 1].id);

        bidder_name = bidder_user[0].name;
        bidder_name = bidder_name.substring(bidder_name.lastIndexOf(" ") + 1);
        bidder_name = "****" + bidder_name;
        product["top_bidder"] = bidder_name;
        let bidder_id = listBidder1[listBidder1.length - 1].id;
        let bidderInfo = await categoryModel.single_by_id('tbluser', bidder_id);
        point = JSON.parse(bidderInfo[0].point);
        like = parseInt(point[0].bidder.substring(0, point[0].bidder.indexOf("-")));
        disLike = parseInt(point[0].bidder.substring(point[0].bidder.indexOf("-") + 1));
        product["bidder_point"] = like / (disLike + like) * 100;
        if (like + disLike == 0) {
            product["bidder_point"] = 100;
        }

        if (like / (like + disLike) > 0.8 || like + disLike == 0) {
            product["bidder_react_haha"] = true;
        } else {
            product["bidder_react_haha"] = false;
        }

        product["top_price"] = listBidder1[listBidder1.length - 1].price;
        product["recommend_price"] = parseInt(product["top_price"]) + parseInt(product["min_increase"]);
    }

    let categoryProduct = await categoryModel.all_product_by_cat('tblproduct', product.cat_id);
    for (let i = 0; i < categoryProduct.length; i++) {
        if (categoryProduct[i].id == product.id) {
            // console.log(categoryProduct[i]);
            categoryProduct.splice(i, 1);
        }
    }
    categoryProduct = categoryProduct.slice(0, 5);
    for (let i = 0; i < categoryProduct.length; i++) {
        let list_bidder_json = categoryProduct[i]["list_bidder"];
        let list_bidder_object = JSON.parse(list_bidder_json);
        let minPriceIndex = 0;
        //  let listBidder_of_Product_Name = [];
        //   let listBidder_of_Product_Point = [];

        //  categoryProduct[i]["listBidder_of_Product_Name"] =listBidder_of_Product_Name;
        //  categoryProduct[i]["listBidder_of_Product_Point"] =listBidder_of_Product_Point;


        for (let j = 0; j < list_bidder_object.length - 1; j++) {
            minPriceIndex = j;
            for (let k = j + 1; k < list_bidder_object.length; k++) {
                if (list_bidder_object[k].price < list_bidder_object[minPriceIndex].price) {
                    let temp = {...list_bidder_object[minPriceIndex] };
                    list_bidder_object[minPriceIndex] = {...list_bidder_object[k] };
                    list_bidder_object[k] = {...temp };
                } else if (list_bidder_object[k].price == list_bidder_object[minPriceIndex].price) {
                    if (list_bidder_object[k].date > list_bidder_object[minPriceIndex].date) {
                        let temp = {...list_bidder_object[minPriceIndex] };
                        list_bidder_object[minPriceIndex] = {...list_bidder_object[k] };
                        list_bidder_object[k] = {...temp };
                    }
                }
            }
        }
        // let bidder_name = "";
        // //bidder_name = list_bidder_object[list_bidder_object.length - 1].name;
        // bidder_name= getBidderName[0].name;
        // bidder_name = bidder_name.substring(bidder_name.lastIndexOf(" ") + 1);
        // top_price = list_bidder_object[list_bidder_object.length - 1].price;
        // bidder_name = "****" + bidder_name;

        let bidder_name = "";
        if (list_bidder_object.length > 0) {
            const getBidderName = await categoryModel.single_by_id('tbluser', list_bidder_object[list_bidder_object.length - 1].id);
            bidder_name = getBidderName[0].name;

            bidder_name = bidder_name.substring(bidder_name.lastIndexOf(" ") + 1);
            top_price = list_bidder_object[list_bidder_object.length - 1].price;
            bidder_name = "****" + bidder_name;
            categoryProduct[i]["bidder"] = bidder_name;
            categoryProduct[i]["top_price"] = top_price;
            categoryProduct[i]["count_bid"] = list_bidder_object.length + " lượt";
        }
        else{
            categoryProduct[i]["bidder"] = "Chưa có ai đấu giá";
            categoryProduct[i]["top_price"] = categoryProduct[i].start_price;
            categoryProduct[i]["count_bid"] = "0 lượt";
        }
        let difference_in_time = categoryProduct[i].end_date.getTime() - dt.getTime();
        let difference_in_date = difference_in_time / (1000 * 3600 * 24);
        if (difference_in_date >= 1 && difference_in_date < 4) {
            categoryProduct[i]["date_time"] = "" + parseInt(difference_in_date) + " ngày nữa";
        } else if (difference_in_date < 1 && difference_in_date > 0) {
            let difference_in_hour = difference_in_time / (1000 * 3600);
            if (difference_in_hour < 1) {
                let difference_in_minute = difference_in_time / (1000 * 60);
                if (difference_in_minute < 1) {
                    categoryProduct[i]["date_time"] = "" + parseInt(difference_in_time / (1000)) + " giây nữa";
                } else {
                    categoryProduct[i]["date_time"] = "" + parseInt(difference_in_minute) + " phút nữa";
                }
            } else {
                categoryProduct[i]["date_time"] = "" + parseInt(difference_in_hour) + " giờ nữa";
            }
        } else {
            categoryProduct[i]["date_time"] = moment(categoryProduct[i].end_date).format('DD-MM-YYYY HH:mm:ss');
        }

    }
    let validValidate = true;
    if (product.is_trusted && res.locals.authUser != null) {
        let userPoint = JSON.parse(res.locals.authUser.point);
        let bidderPoint = userPoint[0].bidder;
        like = parseInt(bidderPoint.substring(0, bidderPoint.indexOf("-")));
        disLike = parseInt(bidderPoint.substring(bidderPoint.indexOf("-") + 1));
        if (disLike != 0) {
            if (like / (like + disLike) * 1000 < 800) {
                validValidate = false;
            }
        }
    }
    let is_seller = false;
    let is_not_seller = false;
    if (res.locals.isAuthenticated && res.locals.authUser.id == product.id_seller) {
        is_seller = true;
    } else {
        is_not_seller = true;
    }
    product["isNotActive"] = true;
    if (product.is_active == 1) {
        product["isNotActive"] = false;
    }
    product["listDeny"] = false;
    if (res.locals.isAuthenticated) {
        if (product.list_deny.includes(res.locals.authUser.id)) {
            product["listDeny"] = true;
            //console.log("Có");
        }
    }
    if (res.locals.isAuthenticated) {
        if (product.id_seller == res.locals.authUser.id && validValidate) {
            isOwnProduct = true;
        }
    }
    //   console.log("is_seller:",is_seller);
    //   console.log("is_not_seller:",is_not_seller);
    // console.log("name:",product.list_bidder_object)
    res.render('products/detailProduct', {
        product,
        categoryProduct,
        validValidate,
        is_seller,
        is_not_seller,
        isOwnProduct
    });
});

router.get('/list_evaluate/:kind/:id', async(req, res) => {
    // console.log("id: ",req.params.id);
    let userByID = await categoryModel.single_by_id("tbluser", req.params.id);
    let user = userByID[0];
    let list_product_winning = [];
    if (req.params.kind == "bidder") {
        list_product_winning = JSON.parse(user.list_product_winner);
    } else {
        list_product_winning = JSON.parse(user.list_product_selled);
    }

    var rows = [];
    for (let i = 0; i < list_product_winning.length; i++) {
        if (list_product_winning[i].status != -1) {
            var tempProduct = await categoryModel.single_by_id("tblproduct", list_product_winning[i].id);
            rows.push(tempProduct[0]);
        }
    }
    //console.log("day la winning length: ", list_product_winning.length);

    for (let i = 0; i < rows.length; i++) {
        // rows[i]["status"] = rows[i].is_active == 1 ? "Bình thường" : "Vô hiệu hóa";
        // rows[i]["can_disable"] = rows[i].is_active == 1 ? true : false;
        rows[i]["start_date_format"] = moment(rows[i].start_date).format('DD-MM-YYYY');
        rows[i]["end_date_format"] = moment(rows[i].end_date).format('DD-MM-YYYY HH:mm:ss');


        let listBidder = JSON.parse(rows[i].list_bidder);
        if (listBidder.length > 0) {
            rows[i]["top_price"] = listBidder[listBidder.length - 1].price;
        } else {
            rows[i]["top_price"] = rows[i].start_price;
        }
        rows[i]["cmt"] = list_product_winning[i].comment;
        if (list_product_winning[i].status == 0)
            rows[i]["status"] = "Không thích";
        else
            rows[i]["status"] = "Thích";
        //  console.log("ngay bat dau",rows[i]["start_date_format"]);

        let seller = await categoryModel.single_by_id("tbluser", rows[i].id_seller);
        rows[i]["name_seller"] = seller[0].name;
        //console.log("day la row ${i}", rows[i])
    }
    // console.log("day la nhung product winner: ",rows);

    res.render('products/list_evaluate', {
        listProduct: rows
    });
})


module.exports = router;