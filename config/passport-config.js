const LocalStrategy = require('passport-local').Strategy;
const categoryModel = require('../models/category.model');
const bcrypt = require('bcryptjs');

function initialize(passport) {
    const authenticateUser = async(email, password, done) => {
        const user = await categoryModel.single_by_email('tbluser', email);
        if (user === null) {
            return done(null, false, { message: 'Email không tồn tại' })
        }

        const rs = bcrypt.compareSync(password, user.password);
        if (rs === false) {
            return done(null, false, { message: 'Mật khẩu bạn nhập vào sai' })
        }

        return done(null, user);
    }
    passport.use(new LocalStrategy({
        usernameField: 'email'
    }, authenticateUser))
    passport.serializeUser((user, done) => done(null, user.id))
    passport.deserializeUser(async(id, done) => {
        const user = await categoryModel.single_by_id('tbluser', id);
        return done(null, user)
    })
}

module.exports = initialize