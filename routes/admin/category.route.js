var express = require('express');
const categoryModel = require('../../models/category.model');

const router = express.Router();

router.get('/', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    const rows = await categoryModel.all_by_level("tblcategory", 1);
    for (let i = 0; i < rows.length; i++) {
        rows[i]['number'] = i + 1;
    }
    res.render('admin/category', {
        categories: rows,
        empty: rows.length === 0,
        layout: false
    });
})

router.get('/get_category/:id', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    try {
        const rows = await categoryModel.all_by_pid("tblcategory", req.params.id);
        res.send(rows);
    } catch (err) {
        console.log(err);
        //     res.end('View error log in console.');
    }
})

router.get('/get_all_category', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    try {
        const rows = await categoryModel.all("tblcategory");
        res.send(rows);

    } catch (err) {
        console.log(err);
        // res.end('View error log in console.');
    }
})

router.get('/create_category', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    let rowsLevel1 = await categoryModel.all_by_level("tblcategory", 1);
    let rowsLevel2 = await categoryModel.all_by_level("tblcategory", 2);
    let rowsResult = rowsLevel1.concat(rowsLevel2);
    console.log(rowsResult);
    res.render('admin/create_category', {
        categories: rowsResult,
        empty: rowsResult.length === 0,
        layout: false
    });
});

router.post('/create_category', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    let pid = parseInt(req.body.parent_id);
    const dataParent = await categoryModel.single_by_id("tblcategory", pid);
    let lv = dataParent[0].level + 1;

    const entity = {
        name: req.body.name,
        parent_id: pid,
        level: lv
    }
    const result = await categoryModel.add("tblcategory", entity);
    const rows = await categoryModel.all("tblcategory");
    res.render('admin/create_category', {
        categories: rows,
        empty: rows.length === 0,
        layout: false
    });
});

router.get('/edit_category/:id', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    const data = await categoryModel.single_by_id("tblcategory", req.params.id);
    if (data.length === 0) {
        throw new Error('Invalid category id');
    }
    const rows = await categoryModel.all("tblcategory");
    console.log(data);
    res.render('admin/edit_category', {
        category: data[0],
        categories: rows,
        layout: false
    })
})

router.post('/edit', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    let entityId = {
        "id": req.body.id
    }
    let entity = {
        "name": req.body.name,
        "parent_id": req.body.parent_id
    }
    const data = await categoryModel.edit("tblcategory", entity, entityId);
    res.redirect('/admin/category');
});

router.post('/delete', async(req, res) => {
    if (!res.locals.isAdmin) {
        return res.render('error_permission', { layout: false });
    }
    let entityId = {
        "id": req.body.id
    }
    const data = await categoryModel.del("tblcategory", entityId);
    res.redirect('/admin/category');
});

module.exports = router;