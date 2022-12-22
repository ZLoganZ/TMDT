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
        "name" : req.body.user_name,
        "phone" : req.body.user_phone,
        "address" : req.body.user_address,
        "email" : req.body.user_email,
        "money" : req.body.money,
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





module.exports = router;