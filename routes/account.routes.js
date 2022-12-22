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
const mailer = require('../middlewares/mail.mdw');
const otpGenerator = require('otp-generator');
const querystring = require('querystring');

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
    try{
        const newUser = {
            "name": req.body.name,
            "phone": req.body.phone,
            "address": req.body.address,
            "email": req.body.email,
            "password": hash,
            "role": '[3]',
            "is_active": 1
        };
        const query = querystring.stringify(newUser);
        res.redirect(`/account/register/checkotp?${query}`);
    } catch (e){
        console.log(e);
    }
    
// const entity = {
//         "name": req.body.name,
//         "phone": req.body.phone,
//         "address": req.body.address,
//         "email": req.body.email,
//         "password": hash,
//         "role": '[3]',
//         "is_active": 1
//     };
//     console.log(entity);
//     const result = await categoryModel.add('tbluser', entity);
//     res.render('guest/login', { layout: false, error: "Đăng ký tài khoản thành công" });
});

router.get('/register/checkotp', async(req, res) => {
    req.session.otp = otpGenerator.generate(6, { upperCase: false, specialChars: false });
    await mailer.sendMailCheckOTP(req.query.email, req.session.otp);
    res.render('guest/checkotp', {
        layout: false,
        message: `Chúng tôi đã gửi mã otp đến email ${req.query.email}, hãy nhập mã OTP để xác nhận`,
        "name": req.query.name,
        "phone": req.query.phone,
        "address": req.query.address,
        "email": req.query.email,
        "password": req.query.password,
        "role": '[3]',
        "is_active": 1
      });
});

router.post('/register/checkotp', async(req, res) => {
    const checkOTP = (req.body.otp == req.session.otp);
    if(checkOTP){
        const entity = {
            "name": req.body.name,
            "phone": req.body.phone,
            "address": req.body.address,
            "email": req.body.email,
            "password": req.body.password,
            "role": '[3]',
            "is_active": 1
        };
        const result = await categoryModel.add('tbluser', entity);
        res.redirect('/account/login');
    } else {
        res.render('guest/checkotp', {
            layout: false,
            message: `Mã OTP không chính xác, hãy nhập lại`,
            "name": req.body.name,
            "phone": req.body.phone,
            "address": req.body.address,
            "email": req.body.email,
            "password": req.body.password,
            "role": '[3]',
            "is_active": 1
            });
    }
});

router.get('/forgotpassword', async(req, res) => {
    res.render('guest/forgotpassword', { layout: false });
});

router.post('/forgotpassword', async(req, res) => {
    const user = await categoryModel.single_by_email('tbluser', req.body.email);
    if (user == null) {
        return res.render('guest/forgotpassword', {
            layout: false,
            error: 'Email không tồn tại'
        });
    }
    try{
        const user = {
            "email": req.body.email
        }
        const query = querystring.stringify(user);
        res.redirect(`/account/forgotpassword/checkotp?${query}`);
    } catch(e){
        console.log(e);
    }
});

router.get('/forgotpassword/checkotp', async(req, res) => {
    req.session.otp = otpGenerator.generate(6, { upperCase: false, specialChars: false });
    await mailer.sendMailCheckOTP(req.query.email, req.session.otp);
    res.render('guest/checkotp', {
        layout: false,
        message: `Chúng tôi đã gửi mã otp đến email ${req.query.email}, hãy nhập mã OTP để xác nhận`,
        "email": req.query.email
        });
});

router.post('/forgotpassword/checkotp', async(req, res) => {
    const checkOTP = (req.body.otp == req.session.otp);
    if(checkOTP){
        const user = await categoryModel.single_by_email('tbluser', req.body.email);
        const id = user.id;
        const entity = {
            "id": id,
        };
        const query = querystring.stringify(entity);
        res.redirect(`/account/forgotpassword/changepassword?${query}`);
    } else {
        res.render('guest/checkotp', {
            layout: false,
            message: `Mã OTP không chính xác, hãy nhập lại`,
            "email": req.body.email
            });
    }
});

router.get('/forgotpassword/changepassword', async(req, res) => {
    res.render('guest/changepassword', {
        layout: false,
        "id": req.query.id
    });
});

router.post('/forgotpassword/changepassword', async(req, res) => {
    const pass = bcrypt.hashSync(req.body.password, 10);
    console.log(req.body.id);
    console.log(req.body.password);
    const entityID = {"id": req.body.id};
    const entity = {
        "password": pass
    };
    const result = await categoryModel.edit('tbluser', entity, entityID);
    res.redirect('/account/login');
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

router.post('/checkActive', async (req, res) => {
        const user = req.session.authUser;
        if(user) {
            const authUser = await categoryModel.single_by_id('tbluser', user.id);
            if(user != authUser[0]){
                req.session.authUser = authUser[0];
            }
            if(authUser[0]?.is_active == 2){
                req.session.isAuthenticated = false;
                req.session.authUser = null;
                //res.redirect('/account/login');
                res.send({"success" : true, error: "Tài khoản của bạn đã bị khóa"});
                // return res.render('guest/login', { layout: false, error: "Tài khoản của bạn đã bị khóa" });
            }
            else{
                res.send("");
            }
        }
        else{
            res.send("");
        }
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
    const pass = (req.body.password == '' ? user[0].password : bcrypt.hashSync(req.body.password, 10));

    const entity = {
        "name": req.body.name,
        "phone": req.body.phone,
        "address": req.body.address,
        "email": req.body.email,
        "password": pass,
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

//edit_for_Payment

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