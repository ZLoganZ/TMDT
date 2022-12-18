const express = require('express');
const exphbs = require('express-handlebars');
const handlebars_sections = require('express-handlebars-sections');
const session = require('express-session')
const morgan = require('morgan');
const numeral = require('numeral');
require('express-async-errors');
var moment = require('moment');
const categoryModel = require('./models/category.model');
const config = require('./config/default.json')

const app = express();
app.use(morgan('dev'));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
}))

app.use(express.static(__dirname));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.engine('handlebars', exphbs({
    helpers: {
        section: handlebars_sections(),
        format: val => numeral(val).format('0,0') + " ₫",
        formatPhone: val => {
            val = "" + val;
            val = val.slice(0, 4) + " " + val.slice(4, 7) + " " + val.slice(7);
            return val;
        },
        getContent: content => { return JSON.stringify(content); },
        getValue: content => { return content; }
    },
}));
app.set('view engine', 'handlebars');

let interval = setInterval(async() => {
    let offsetGMT = 7;
    let today = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);
    const rowsProduct = await categoryModel.all_product_not_expired('tblproduct');
    // console.log(rowsProduct);
    for (let i = 0; i < rowsProduct.length; i++) {
        if (rowsProduct[i].end_date < today) {
            let entityID = { id: rowsProduct[i].id };
            let entity = { is_expired: true };
            categoryModel.edit('tblproduct', entity, entityID);
            let user = await categoryModel.single_by_id('tbluser', rowsProduct[i].id_seller);
            let listProductSelled = JSON.parse(user[0].list_product_selled);
            entityID = { id: rowsProduct[i].id_seller };
            let item = {
                id: rowsProduct[i].id,
                status: -1,
                comment: "",
                isFeedback: -1,
            }
            listProductSelled.push(item);
            entity = {
                list_product_selled: JSON.stringify(listProductSelled)
            }
            categoryModel.edit('tbluser', entity, entityID);

            let listBidder = JSON.parse(rowsProduct[i].list_bidder);
            for (let j = 0; j < listBidder.length - 1; j++) {
                minPriceIndex = j;
                for (let k = j + 1; k < listBidder.length; k++) {
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
            if (listBidder.length > 0) {
                let winnerItem = listBidder[listBidder.length - 1];
                let userWinner = await categoryModel.single_by_id('tbluser', winnerItem.id);
                entityID = { id: winnerItem.id };
                let listProductWinner = JSON.parse(userWinner[0].list_product_winner);
                item = {
                    id: rowsProduct[i].id,
                    status: -1,
                    comment: "",
                    isFeedback: -1
                }
                listProductWinner.push(item);
                entity = {
                    list_product_winner: JSON.stringify(listProductWinner)
                }
                categoryModel.edit('tbluser', entity, entityID);

                const rowsUser = await categoryModel.all('tbluser')
                for (let j = 0; j < rowsUser.length; j++) {
                    entityID = { id: rowsUser[j].id };
                    let listBidding = JSON.parse(rowsUser[j].list_product_bidding);
                    listBidding = removeItemInList(listBidding, rowsProduct[i].id);
                    entity = {
                        list_product_bidding: JSON.stringify(listBidding)
                    }
                    categoryModel.edit('tbluser', entity, entityID);
                }
            }

        }
    }
    console.log(today);
}, 60000);

function removeItemInList(list, id) {
    for (let j = list.length - 1; j >= 0; j--) {
        if (list[j].id == id) {
            console.log(list[j].id);
            list.splice(j, 1);
        }
    }
    return list;
}

app.get('/auto_generate_list_bidder', async(req, res) => {
    // const listComment = ["Hàng ngon đấy", "Xài cũng tạm được", "Hàng giả, hàng cũ"];
    const rows = await categoryModel.all('tblproduct');
    const user = await categoryModel.all('tbluser');
    let list_list_bidder = [];
    for (let i = 0; i < rows.length; i++) {
        let numBid = 5 + Math.floor(Math.random() * 45);
        let list_bidder = [];
        for (let j = 0; j < numBid; j++) {
            let bidder = {};
            bidder["number"] = j + 1;
            let idUser = Math.floor(Math.random() * user.length);
            bidder["id"] = user[idUser].id;
            bidder["date"] = randomDate(rows[i].start_date, rows[i].end_date, rows[i].start_date.getHours(), rows[i].end_date.getHours());
            let countRan = parseInt((rows[i].buynow_price - rows[i].start_price) / rows[i].min_increase);
            let price = Math.floor(Math.random() * countRan) * rows[i].min_increase + rows[i].start_price;
            bidder["price"] = price;
            list_bidder.push(bidder);
        }
        list_list_bidder.push(list_bidder);
    }
    // console.log(list_list_bidder);
    for (let i = 0; i < rows.length; i++) {
        let minDateIndex = 0
        for (let j = 0; j < list_list_bidder[i].length - 1; j++) {
            minDateIndex = j;
            for (let k = j + 1; k < list_list_bidder[i].length; k++) {
                if (list_list_bidder[i][k].date < list_list_bidder[i][minDateIndex].date) {
                    let temp = {...list_list_bidder[i][minDateIndex] };
                    list_list_bidder[i][minDateIndex] = {...list_list_bidder[i][k] };
                    list_list_bidder[i][k] = {...temp };
                }
            }

        }
        for (let j = 0; j < list_list_bidder[i].length; j++) {
            list_list_bidder[i][j].number = j + 1;
        }
        let entity = { "list_bidder": JSON.stringify(list_list_bidder[i]) };
        let entityID = { "id": rows[i].id };
        const update = await categoryModel.edit('tblproduct', entity, entityID);
    }

    const rows1 = await categoryModel.all('tblproduct');
    for (let i = 0; i < user.length; i++) {
        let list_bidder = [];
        let listProductBidding = [];
        for (let j = 0; j < rows1.length; j++) {
            let productBidding = {};
            list_bidder = JSON.parse(rows1[j].list_bidder);
            for (let k = list_bidder.length - 1; k >= 0; k--) {
                if (list_bidder[k].id == user[i].id) {
                    productBidding["id"] = rows1[j].id;
                    productBidding["price"] = list_bidder[k].price;
                    productBidding["date"] = list_bidder[k].date;
                    break;
                }
            }
            if (productBidding.id != null) {
                listProductBidding.push(productBidding);
            }
        }
        let entity = { "list_product_bidding": JSON.stringify(listProductBidding) };
        let entityID = { "id": user[i].id };
        const updateUser = await categoryModel.edit('tbluser', entity, entityID);
    }

    res.end('ok');
});

function randomDate(start, end, startHour, endHour) {
    let date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date;
}

// app.use(require('./middlewares/locals.mdw'));
require('./middlewares/locals.mdw')(app);
require('./middlewares/routes.mdw')(app);

app.get('/', async(req, res) => {
    let offsetGMT = 7;
    let today = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);
    const rows1 = await categoryModel.all('tblproduct', today);
    let rows = [];
    for (let i = 0; i < rows1.length; i++) {
        if (rows1[i].end_date > today) {
            rows.push(rows1[i]);
        }
    }
    let index = 0;
    for (let i = 0; i < rows.length - 1; i++) {
        index = i;
        for (let j = i + 1; j < rows.length; j++) {
            if (rows[j].end_date < rows[index].end_date) {
                let temp = {...rows[index] };
                rows[index] = {...rows[j] };
                rows[j] = {...temp };
            }
        }
    }

    for (let i = 0; i < rows.length; i++) {
        let listBidder1 = [];
        listBidder1 = JSON.parse(rows[i].list_bidder);
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
        if (listBidder1.length > 0) {
            rows[i]["top_price"] = listBidder1[listBidder1.length - 1].price;
        } else {
            rows[i]["top_price"] = rows[i].start_price;
        }
        let difference_in_time = rows[i].end_date.getTime() - today.getTime();
        let difference_in_date = difference_in_time / (1000 * 3600 * 24);
        if (difference_in_date >= 1 && difference_in_date < 4) {
            rows[i]["end_date_format"] = "" + parseInt(difference_in_date) + " ngày nữa";
        } else if (difference_in_date < 1 && difference_in_date > 0) {
            let difference_in_hour = difference_in_time / (1000 * 3600);
            if (difference_in_hour < 1) {
                let difference_in_minute = difference_in_time / (1000 * 60);
                if (difference_in_minute < 1) {
                    rows[i]["end_date_format"] = "" + parseInt(difference_in_time / (1000)) + " giây nữa";
                } else {
                    rows[i]["end_date_format"] = "" + parseInt(difference_in_minute) + " phút nữa";
                }
            } else {
                rows[i]["end_date_format"] = "" + parseInt(difference_in_hour) + " giờ nữa";
            }
        } else {
            rows[i]["end_date_format"] = moment(rows[i].end_date).format('DD-MM-YYYY HH:mm:ss');
        }
    }
    // console.log(rows);
    let list_ended1 = [];
    let list_ended2 = [];
    let activeItem = {};
    for (let i = 0; i < 6; i++) {
        if (i == 0) {
            activeItem = rows[i];
        } else if (i < 3) {
            list_ended1[i] = {...rows[i] };
        } else {
            list_ended2.push(rows[i]);
        }
    }

    for (let i = 0; i < rows.length - 1; i++) {
        index = i;
        for (let j = i + 1; j < rows.length; j++) {
            let listBidder1 = JSON.parse(rows[index].list_bidder);
            let listBidder2 = JSON.parse(rows[j].list_bidder);
            if (listBidder2.length > listBidder1.length) {
                let temp = {...rows[index] };
                rows[index] = {...rows[j] };
                rows[j] = {...temp };
                rows[index]["count"] = listBidder2.length;
            }
        }
    }
    let list_popular = [];
    for (let i = 0; i < 5; i++) {
        list_popular[i] = {...rows[i] };
    }

    for (let i = 0; i < rows.length - 1; i++) {
        index = i;
        for (let j = i + 1; j < rows.length; j++) {
            let listBidder1 = JSON.parse(rows[index].list_bidder);
            let listBidder2 = JSON.parse(rows[j].list_bidder);
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
            minPriceIndex = 0;
            for (let j = 0; j < listBidder2.length - 1; j++) {
                minPriceIndex = j;
                for (let k = j + 1; k < listBidder2.length; k++) {
                    if (listBidder2[k].price < listBidder2[minPriceIndex].price) {
                        let temp = {...listBidder2[minPriceIndex] };
                        listBidder2[minPriceIndex] = {...listBidder2[k] };
                        listBidder2[k] = {...temp };
                    } else if (listBidder2[k].price == listBidder2[minPriceIndex].price) {
                        if (listBidder2[k].date > listBidder2[minPriceIndex].date) {
                            let temp = {...listBidder2[minPriceIndex] };
                            listBidder2[minPriceIndex] = {...listBidder2[k] };
                            listBidder2[k] = {...temp };
                        }
                    }
                }
            }
            let topPriceList1 = 0;
            let topPriceList2 = 0;
            if (listBidder1.length > 0) {
                topPriceList1 = parseInt(listBidder1[listBidder1.length - 1].price);
            } else {
                topPriceList1 = parseInt(rows[index].start_price);
            }
            if (listBidder2.length > 0) {
                topPriceList2 = parseInt(listBidder2[listBidder2.length - 1].price);
            } else {
                topPriceList2 = parseInt(rows[j].start_price);
            }
            if (topPriceList2 > topPriceList1) {
                let temp = {...rows[index] };
                rows[index] = {...rows[j] };
                rows[j] = {...temp };
                rows[index]["top_price"] = "" + topPriceList2;
            }
        }
    }
    let list_top_price = [];
    let first_top_price = {};
    for (let i = 0; i < 5; i++) {
        if (i == 0) {
            first_top_price = rows[i];
        } else {
            list_top_price[i] = {...rows[i] };
        }
    }
    // console.log(list_top_price);
    res.render('home', {
        activeItem,
        first_top_price,
        list_popular,
        list_ended1,
        list_ended2,
        list_top_price
    });
});

app.get('/search', async(req, res) => {
    let table = "";
    let resultTotal = [];
    if (req.query.style === "0") {
        table = "tblproduct";
        let rows1 = await categoryModel.full_text_search(table, req.query.search_text);
        let offsetGMT = 7;
        let today = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);
        let rows = [];
        for (let i = 0; i < rows1.length; i++) {
            rows1[i].end_date = new Date(rows1[i].end_date.getTime() + offsetGMT * 3600 * 1000);
            rows1[i].start_date = new Date(rows1[i].start_date.getTime() + offsetGMT * 3600 * 1000);
            if (rows1[i].end_date > today) {
                rows.push(rows1[i]);
            }
        }
        resultTotal = rows;
        console.log(rows)
    } else if (req.query.style === "1") {
        table = "tblcategory";
        let rows = await categoryModel.full_text_search(table, req.query.search_text);
        for (let i = 0; i < rows.length; i++) {
            let data = await categoryModel.all_product_by_cat('tblproduct', rows[i].id);
            let offsetGMT = 7;
            let today = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);
            let rows1 = [];
            for (let j = 0; j < data.length; j++) {
                data[j].end_date = new Date(data[j].end_date.getTime() + offsetGMT * 3600 * 1000);
                data[j].start_date = new Date(data[j].start_date.getTime() + offsetGMT * 3600 * 1000);
                if (data[j].end_date > today) {
                    rows1.push(data[j]);
                }
            }
            resultTotal = resultTotal.concat(rows1);
        }
    } else {
        table = "tbluser";
        let rows = await categoryModel.full_text_search(table, req.query.search_text);
        for (let i = 0; i < rows.length; i++) {
            let data = await categoryModel.all_product_by_seller('tblproduct', rows[i].id);
            let offsetGMT = 7;
            let today = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);
            let rows1 = [];
            for (let j = 0; j < data.length; j++) {
                data[j].end_date = new Date(data[j].end_date.getTime() + offsetGMT * 3600 * 1000);
                data[j].start_date = new Date(data[j].start_date.getTime() + offsetGMT * 3600 * 1000);
                if (data[j].end_date > today) {
                    rows1.push(data[j]);
                }
            }
            resultTotal = resultTotal.concat(rows1);
        }
    }
    // console.log(result);
    let offsetGMT = 7;
    let dt = new Date(new Date().getTime() + offsetGMT * 3600 * 1000);
    const limit = config.paginate.limit;
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
    let nPage = Math.floor(resultTotal.length / limit);
    if (resultTotal.length % limit > 0) {
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
    for (let i = 0; i < resultTotal.length; i++) {
        let list_bidder_json = resultTotal[i]["list_bidder"];
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
            resultTotal[i]["bidder"] = bidder_name;
            resultTotal[i]["top_price"] = top_price;
            resultTotal[i]["count_bid"] = list_bidder_object.length + " lượt";
        } else {
            resultTotal[i]["bidder"] = "Chưa có người ra giá";
            resultTotal[i]["top_price"] = resultTotal[i].start_price;
            resultTotal[i]["count_bid"] = "0 lượt";
        }
        let difference_in_time = resultTotal[i].end_date.getTime() - dt.getTime();
        let difference_in_date = difference_in_time / (1000 * 3600 * 24);
        if (difference_in_date >= 1 && difference_in_date < 4) {
            resultTotal[i]["date_time"] = "" + parseInt(difference_in_date) + " ngày nữa";
        } else if (difference_in_date < 1 && difference_in_date > 0) {
            let difference_in_hour = difference_in_time / (1000 * 3600);
            if (difference_in_hour < 1) {
                let difference_in_minute = difference_in_time / (1000 * 60);
                if (difference_in_minute < 1) {
                    resultTotal[i]["date_time"] = "" + parseInt(difference_in_time / (1000)) + " giây nữa";
                } else {
                    resultTotal[i]["date_time"] = "" + parseInt(difference_in_minute) + " phút nữa";
                }
            } else {
                resultTotal[i]["date_time"] = "" + parseInt(difference_in_hour) + " giờ nữa";
            }
        } else {
            resultTotal[i]["date_time"] = moment(resultTotal[i].end_date).format('DD-MM-YYYY HH:mm:ss');
        }
        let isNew = false;
        let start_date = resultTotal[i].start_date;
        difference_in_time = dt.getTime() - start_date;
        let difference_in_minute_start_date = difference_in_time / (1000 * 60);
        console.log(start_date);
        if (difference_in_minute_start_date < 60) {
            resultTotal[i]["is_new"] = true;
        }
    }

    if (sortFillter == 1) {
        if (sortOrder == 1) {
            sortDateInrease(resultTotal);
        } else {
            isIncrease = false;
            sortDateDecrease(resultTotal);
        }
    } else {
        if (sortOrder == 1) {
            sortPriceIncrease(resultTotal);
        } else {
            isIncrease = false
            sortPriceDecrease(resultTotal);
        }
        isSortdate = false;
    }
    let result = resultTotal.slice(offset, offset + limit);

    res.render('products/allBySearch', {
        products: result,
        empty: result.length === 0,
        page_numbers,
        prev_value: +page - 1,
        next_value: +page + 1,
        keyword: req.query.search_text,
        style: req.query.style,
        sortOrder,
        sortFillter,
        disable_prev,
        disable_next,
        isIncrease,
        isSortdate
    });
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

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.render('error500', { layout: false });
})

app.use((req, res, next) => {
    res.render('error404', { layout: false });
})

app.listen(3000);