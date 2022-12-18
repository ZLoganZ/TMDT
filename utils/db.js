const mysql = require("mysql");
const util = require("util");

const pool = mysql.createPool({
  connectionLimit: 50,
  host: "",
  port: 3306,
  user: "admin",
  password: "",
  database: "online_aution",
});

const mysql_query = util.promisify(pool.query).bind(pool);
module.exports = {
  load: (sql) => {
    //console.log(sql);
    return mysql_query(sql);
  },
  add: (table, entity) => {
    return mysql_query(`insert into ${table} set ?`, entity);
  },
  del: (table, entity) => {
    // console.log(entity);
    return mysql_query(`delete from ${table} where ?`, entity);
  },
  edit: (table, entity, entityId) => {
    //  console.log(entityId);
    // console.log(entity);
    return mysql_query(`update ${table} set ? where ?`, [entity, entityId]);
  },
  // load: sql => new Promise((done, fail) => {
  //     pool.query(sql, (error, results, fields) => {
  //         if (error) {
  //             return fail(error);
  //         } else {
  //             done(results);
  //         }
  //     });
  // })
};
