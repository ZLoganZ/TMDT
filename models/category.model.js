const db = require('../utils/db');
const config = require('../config/default.json')
module.exports = {
    all: (table) => { return db.load(`select * from ${table};`) },
    all_by_level: (table, level) => { return db.load(`select * from ${table} where level = ${level}`) },
    single_by_id: (table, id) => { return db.load(`select * from ${table} where id = ${id}`) },
    all_by_pid: (table, id) => { return db.load(`select * from ${table} where parent_id = ${id}`) },
    all_product_by_cat: (table, id) => { return db.load(`select * from ${table} where cat_id = ${id}`) },
    all_product_by_seller: (table, id) => { return db.load(`select * from ${table} where id_seller = ${id}`) },
    count_product_by_cat: async(table, id) => {
        const rows = await db.load(`select count(*) as total from ${table} where cat_id = ${id}`);
        return rows[0].total;
    },
    page_product_by_cat: (table, id, offset) => { return db.load(`select * from ${table} where cat_id = ${id} limit ${config.paginate.limit} offset ${offset}`) },
    add: (table, entity) => { return db.add(table, entity) },
    del: (table, entity) => { return db.del(table, entity) },
    edit: (table, entity, entityId) => {
        return db.edit(table, entity, entityId)
    },
    allWithDetail: _ => {
        const sql = `SELECT c.id, c.name, c.parent_id, c.level, count(p.id) as num_of_products from tblcategory c left JOIN tblproduct p on c.id = p.cat_id GROUP BY c.id, c.name`;
        return db.load(sql);
    },
    getAllChildCatByLevel: (table, level) => { return db.load(`select * from ${table} where level = ${level};`) },
    single_by_email: async(table, email) => {
        const rows = await db.load(`select * from ${table} where email = '${email}'`);
        if (rows.length === 0) {
            return null;
        }
        return rows[0];
    },
    full_text_search: (table, keyword) => { return db.load(`SELECT * FROM ${table} WHERE MATCH(name) Against("${keyword}");`) },
    all_product_not_expired: (table) => { return db.load(`SELECT * FROM ${table} WHERE is_expired = false`) },
};