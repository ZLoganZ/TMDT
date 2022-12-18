const restrict = require('./auth.mdw');
module.exports = function(app) {
    app.use('/account', require('../routes/account.routes'));
    app.use('/admin/category', restrict, require('../routes/admin/category.route'));
    app.use('/admin/user', restrict, require('../routes/admin/user.route'));
    app.use('/category', require('../routes/category.routes'));
    app.use('/admin/product', restrict, require('../routes/admin/product.route'));
    app.use('/seller/product', restrict, require('../routes/seller/product.route'));
    app.use('/bidder/product', restrict, require('../routes/bidder/product.route'));
}