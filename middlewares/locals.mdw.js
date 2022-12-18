const categoryModel = require('../models/category.model');
const icon = ["fas fa-laptop", "fas fa-keyboard", "fas fa-desktop", "fas fa-microchip", "fas fa-chair"]
module.exports = function(app) {

    app.use(async(req, res, next) => {
        const rows = await categoryModel.allWithDetail();
        let category = [];
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].level == 1) {
                category.push({ "name": rows[i].name, "id": rows[i].id, "count": 0 });
                switch (rows[i].id) {
                    case 1:
                        category[category.length - 1].icon = icon[0];
                        break;
                    case 42:
                        category[category.length - 1].icon = icon[1];
                        break;
                    case 77:
                        category[category.length - 1].icon = icon[2];
                        break;
                    case 84:
                        category[category.length - 1].icon = icon[3];
                        break;
                    case 137:
                        category[category.length - 1].icon = icon[4];
                        break;
                }

            }
        }
        for (let i = 0; i < category.length; i++) {
            let sub_category = [];
            for (let j = 0; j < rows.length; j++) {
                if (rows[j].level == 2) {
                    if (category[i].id == rows[j].parent_id) {
                        sub_category.push({ "name": rows[j].name, "id": rows[j].id, "count": 0, "haveSub": false });
                        category[i].count += 1;
                    }
                }
                category[i]["subcategory"] = sub_category;
                if (sub_category.length > 0) {
                    category[i].haveSub = true;
                }
                if (category[i].count == 0) {
                    delete category[i].count;
                }
            }
        }
        for (let i = 0; i < category.length; i++) {
            for (let j = 0; j < category[i].subcategory.length; j++) {
                let sub_category = [];
                for (let k = 0; k < rows.length; k++) {
                    if (rows[k].level == 3) {
                        if (rows[k].parent_id == category[i].subcategory[j].id) {
                            sub_category.push({ "name": rows[k].name, "id": rows[k].id, "count": rows[k].num_of_products });
                            category[i].subcategory[j].count += rows[k].num_of_products;
                        }
                    }
                }
                category[i].subcategory[j]["subcategory"] = sub_category;
                if (sub_category.length > 0) {
                    category[i].subcategory[j].haveSub = true;
                } else {
                    let id = category[i].subcategory[j].id;
                    for (let l = 0; l < rows.length; l++) {
                        if (rows[l].id == id) {
                            if (rows[l].level == 2) {
                                if (rows[l].num_of_products > 0) {
                                    category[i].subcategory[j].count = rows[l].num_of_products;
                                    break;
                                }
                            }
                        }
                    }
                }




                if (category[i].subcategory[j].count == 0) {
                    // console.log(j);
                    // console.log(category[2].subcategory);
                    // if (category[i].subcategory[j].haveSub === false) {

                    // } else {
                    delete category[i].subcategory[j].count;
                    // }
                }
            }
        }
        res.locals.lcCategories = category;

        if (typeof(req.session.isAuthenticated) === 'undefined') {
            req.session.isAuthenticated = false;
        }

        res.locals.isAuthenticated = req.session.isAuthenticated;
        res.locals.authUser = req.session.authUser;
        let role = "";
        res.locals.isAdmin = false;
        res.locals.isSeller = false;
        res.locals.isBidder = false;
        if (res.locals.authUser != null) {
            role = res.locals.authUser.role;
            role = role.substring(1, role.length - 1);
            let listRole = [];
            listRole = role.split(",");

            for (let i = 0; i < listRole.length; i++) {
                if (listRole[i] === "1") {
                    res.locals.isAdmin = true;
                }
                if (listRole[i] === "2") {
                    res.locals.isSeller = true;
                }
                if (listRole[i] === "3") {
                    res.locals.isBidder = true;
                }
            }
        }
        // console.log(req.session.authUser);
        // console.log(res.locals.isAuthenticated);
        next();
    })
}

// module.exports = async(req, res, next) => {
//     const rows = await categoryModel.allWithDetail();
//     let category = [];
//     for (let i = 0; i < rows.length; i++) {
//         if (rows[i].level == 1) {
//             category.push({ "name": rows[i].name, "id": rows[i].id, "count": 0 });
//         }
//     }
//     for (let i = 0; i < category.length; i++) {
//         let sub_category = [];
//         for (let j = 0; j < rows.length; j++) {
//             if (rows[j].level == 2) {
//                 if (category[i].id == rows[j].parent_id) {
//                     sub_category.push({ "name": rows[j].name, "id": rows[j].id, "count": 0, "haveSub": false });
//                     category[i].count += 1;
//                 }
//             }
//             category[i]["subcategory"] = sub_category;
//             if (sub_category.length > 0) {
//                 category[i].haveSub = true;
//             }
//             if (category[i].count == 0) {
//                 delete category[i].count;
//             }
//         }
//     }
//     for (let i = 0; i < category.length; i++) {
//         for (let j = 0; j < category[i].subcategory.length; j++) {
//             let sub_category = [];
//             for (let k = 0; k < rows.length; k++) {
//                 if (rows[k].level == 3) {
//                     if (rows[k].parent_id == category[i].subcategory[j].id) {
//                         sub_category.push({ "name": rows[k].name, "id": rows[k].id, "count": rows[k].num_of_products, "haveSub": false });
//                         category[i].subcategory[j].count += rows[k].num_of_products;
//                     }
//                 }
//             }
//             category[i].subcategory[j]["subcategory"] = sub_category;
//             if (sub_category.length > 0) {
//                 category[i].subcategory[j].haveSub = true;
//             }
//             if (category[i].subcategory[j].count == 0) {
//                 delete category[i].subcategory[j].count;
//             }
//         }
//     }
//     res.locals.lcCategories = category;
//     // console.log(res.locals.lcCategories);
//     next();
// }