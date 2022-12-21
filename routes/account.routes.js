const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const categoryModel = require('../models/category.model');
const request = require('request');
const moment = require('moment');
const restrict = require('../middlewares/auth.mdw');
const secretKey = "6LeQAMwUAAAAANC665bQZKP5KE-JUtd6UQdXcG-D";
const passport = require('passport');
const initializePassport = require('../config/passport-config');
const flash = require('express-flash');
const session = require('express-session')

initializePassport(
    passport,
    email => user.find(user => user.email === email),
    id => user.find(user => user.id === id)
)

router.use(flash());
router.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
}))
router.use(passport.initialize());
router.use(passport.session());

router.get('/register', async(req, res) => {
    res.render('guest/register', { layout: false });
});

router.post('/verify', (req, res) => {
    if (!req.body.captcha) {
        console.log("err");
        return res.json({ "success": false, "msg": "Capctha is not checked" });
    }

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}`;

    request(verifyUrl, (err, response, body) => {

        if (err) { console.log(err); }

        body = JSON.parse(body);

        if (!body.success && body.success === undefined) {
            return res.json({ "success": false, "msg": "captcha verification failed" });
        } else if (body.score < 0.5) {
            return res.json({ "success": false, "msg": "you might be a bot, sorry!", "score": body.score });
        }

        // return json message or continue with your function. Example: loading new page, ect
        return res.json({ "success": true, "msg": "captcha verification passed", "score": body.score });

    })
})

router.post('/register', async(req, res) => {
    const N = 10;
    const hash = bcrypt.hashSync(req.body.password, N);

    const user = await categoryModel.single_by_email('tbluser', req.body.email);
    if (user != null) {
        return res.render('guest/register', {
            layout: false,
            err_message: 'Email đã tồn tại'
        });
    }

    const entity = {
        "name": req.body.name,
        "phone": req.body.phone,
        "address": req.body.address,
        "email": req.body.email,
        "password": hash,
        "role": '[3]',
        "is_active": 1
    };

    console.log(entity);
    const result = await categoryModel.add('tbluser', entity);
    res.render('guest/register', { layout: false });
});

router.get('/login', async(req, res) => {
    res.render('guest/login', { layout: false, error: req.flash('error') });
});

router.post('/login', passport.authenticate('local', {
        failureRedirect: '/account/login',
        failureFlash: true
    }),
    function(req, res) {
        req.session.isAuthenticated = true;
        req.session.authUser = req.user;
        const url = req.query.retUrl || '/';
        res.redirect(url);
    });



// router.post('/login', async(req, res) => {
//     const user = await categoryModel.single_by_email('tbluser', req.body.email);
//     if (user === null) {
//         return res.render('guest/login', {
//             layout: false,
//             err_message: 'Email không tồn tại'
//         });
//     }

//     const rs = bcrypt.compareSync(req.body.password, user.password);
//     if (rs === false) {
//         return res.render('guest/login', {
//             layout: false,
//             err_message: 'Mật khẩu bạn nhập vào sai'
//         });
//     }

//     delete user.password;
// req.session.isAuthenticated = true;
// req.session.authUser = user;

//     const url = req.query.retUrl || '/';
//     res.redirect(url);
//     // res.redirect(req.headers.referer);
// });

router.post('/logout', (req, res) => {
    req.session.isAuthenticated = false;
    req.session.authUser = null;
    res.redirect(req.headers.referer);
});

router.get('/profile',restrict, async(req, res) => {
    const user = await categoryModel.single_by_id('tbluser', req.session?.authUser?.id);
    user[0]["not_seller"] = !res.locals.isSeller;

    user[0]["is_seller"] = res.locals.isSeller;
    if (!user[0]["is_seller"]) {
        user[0]["is_bidder"] = res.locals.isBidder;
    }
    console.log(user[0].point);
    const listDanhGia1 = JSON.parse(user[0].point);
    const listDanhGia = listDanhGia1[0];
    let tempKeyPair = Object.entries(listDanhGia).map(([key, value]) => ({ key, value }))
    const likeSel = parseInt(tempKeyPair[0].value.split("-")[0]);
    const unlikeSel = parseInt(tempKeyPair[0].value.split("-")[1]);
    const seller = likeSel + unlikeSel;
    //   console.log("Key Value: ",like+unlike);
    if (seller == 0) {
        user[0]["likeSel"] = 100;
        user[0]["unlikeSel"] = 100;
    }
    if (seller > 0) {
        user[0]["likeSel"] = Math.ceil(likeSel / seller * 100);
        user[0]["unlikeSel"] = unlikeSel / seller * 100;
    }


    const likeBid = parseInt(tempKeyPair[1].value.split("-")[0]);
    const unlikeBid = parseInt(tempKeyPair[1].value.split("-")[1]);
    const bidder = likeBid + unlikeBid;
    //   console.log("Key Value: ",like+unlike);
    if (bidder == 0) {
        user[0]["likeBid"] = 100;
        user[0]["unlikeBid"] = 100;
    }
    if (bidder > 0) {
        user[0]["likeBid"] = Math.ceil(likeBid / bidder * 100);
        user[0]["unlikeBid"] = unlikeBid / bidder * 100;
    }

    res.render('general/profile', {
        layout: false,
        profile: user[0],

    });

});

router.post('/profile', async(req, res) => {
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

    res.redirect('/account/profile')
});

router.post('/promote', async(req, res) => {
    let entityId = { id: req.body.id };
    console.log('Day la userID:', req.body);
    const entity = {
        "is_approve_seller": 1
    };
    const data = await categoryModel.edit("tbluser", entity, entityId);

    res.send({ "success": true });
});

router.get('/list_evaluate/:kind', restrict, async(req, res) => {

    let user = req.session.authUser;
    let list_product_winning;
    if (req.params.kind == "bidder") {
        list_product_winning = JSON.parse(user.list_product_winner);
    }
    if (req.params.kind == "seller") {
        list_product_winning = JSON.parse(user.list_product_selled);
    }

    const rows = [];
    for (let i = 0; i < list_product_winning.length; i++) {
        if (list_product_winning[i].status != -1) {
            const tempProduct = await categoryModel.single_by_id("tblproduct", list_product_winning[i].id);
            rows.push(tempProduct[0]);
        }
    }
    //  console.log("day la winning length: ",list_product_winning.length);

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
        console.log("day la row ${i}", rows[i])
    }
    // console.log("day la nhung product winner: ",rows);
    res.render('general/list_evaluate', {
        listProduct: rows,
        // empty: rows.length === 0,
        layout: false
    });
})
router.post('/edit', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    let entityId = {
        "id": parseInt(req.body.id)
    }
    let entity = {
        "is_active": req.body.is_active
    }
    const data = await categoryModel.edit("tblproduct", entity, entityId);
    res.redirect('/admin/user');
});
module.exports = router;

//get_user_payment
router.get('/get_user_payment',restrict, async(req, res) => {
    const user = await categoryModel.single_by_id('tbluser', req.session?.authUser?.id);
    console.log(user[0].point);
    res.send(user[0]);


});

