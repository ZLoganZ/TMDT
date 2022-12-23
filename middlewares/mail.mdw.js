var nodemailer = require('nodemailer');

const option = {
    host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'vandatdinh2@gmail.com',
    pass: 'ymwufhhvjnspfncx',
  },
};
var transporter = nodemailer.createTransport(option);

function sendMail(from, to, subject, html) {
    transporter.verify(function (error, success) {
        if (error) {
            console.log(error);
        } else {
            console.log('Kết nối thành công!');
            var mail = {
                from,
                to,
                subject,
                html
            };
            transporter.sendMail(mail, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
        }
    });
};

module.exports = {
    sendMail: () => {
    },

    sendMailEndBidToBidder: (userMail, product) => {
        console.log("Gui mail thong bao ket thuc phien dau gia toi nguoi thang!!!")
        const from = 'vandatdinh2@gmail.com';
        const to = userMail;
        const subject = 'Thông báo từ BidHub: bạn đã chiến thắng trong phiên đấu giá';
        const html = `<h3>Tên sản phẩm: ${product.productName}</h3>
        <h3>Giá: ${product.currentPrice}</h3>
        <h3>Thời điểm kết thúc: ${product.endDate}</h3>
        <a href="http://localhost:3000/checkout/${product.productID}">Thanh toán tại đây</a>`;
        return sendMail(from, to, subject, html);
    },

    sendMailEndBidToSeller: (userMail, product, isBided) => {
        console.log("Gui mail thong bao ket thuc phien dau gia toi nguoi ban!!!")
        const from = 'vandatdinh2@gmail.com';
        const to = userMail;
        const subject = 'Thông báo từ BidHub: sản phẩm của bạn đã hết thời gian đấu giá '
        let html = `<h3>Tên sản phẩm: ${product.productName}</h3>
        <h3>Giá: ${product.currentPrice}</h3>
        <h3>Thời điểm kết thúc: ${product.endDate}</h3>
        <a href = "http://localhost:3000/product/${product.productID}">Xem chi tiết tại đây</a>`;
        if (isBided == false)
            html = `<h3>Tên sản phẩm: ${product.productName}</h3>
            <h3>Giá: ${product.price}</h3>
            <h3>Thời điểm kết thúc: ${product.endDate}</h3>
            <h3>Chưa có ai đấu giá sản phẩm này!!!</h3>
            <a href = "http://localhost:3000/product/${product.productID}">Xem chi tiết tại đây</a>`
        return sendMail(from, to, subject, html);
    },

    sendMailRefuseBidToSBidder: (userMail, product) => {
        console.log("Gui mail thong bao tu choi dau gia cho nguoi dau gia!!!")
        const from = 'vandatdinh2@gmail.com';
        const to = userMail;
        const subject = 'Thông báo từ BidHub: bạn đã bị từ chối đấu giá'
        let html = `<h3>Tên sản phẩm: ${product.productName}</h3>
        <h3>Giá: ${product.currentPrice}</h3>
        <h3>Bạn không thể đấu giá sản phẩm này nữa!!!</h3>
        <a href = "http://localhost:3000/account#bid-history">Xem chi tiết tại đây</a>`;
        return sendMail(from, to, subject, html);
    },

    sendMailConfirmBid: (sellerEMail, bidderEmail, oldHolderEmail, product) => {
        console.log("Gui mail thong bao co luot dau gia moi!!!")
        const from = 'vandatdinh2@gmail.com';
        let to = `${sellerEMail}, ${bidderEmail}, ${oldHolderEmail}`;
        if (oldHolderEmail == false)
            to = `${sellerEMail}, ${bidderEmail}`;
        const subject = 'Thông báo từ BidHub: thông báo có lượt đấu giá mới'
        const html = `<h3>Tên sản phẩm: ${product.productName}</h3>
        <h3>Giá hiện tại: ${product.currentPrice}</h3>
        <a href = "http://localhost:3000/product/${product.productID}">Xem chi tiết tại đây</a>`;
        return sendMail(from, to, subject, html);
    },

    sendMailCheckOTP: (userMail, OTP) => {
        console.log("Gui mail CHECK OTP!!!")
        const from = 'vandatdinh2@gmail.com';
        let to = `${userMail}`;
        const subject = 'Thông báo từ Online Auction: gửi mã xác nhận'
        const html = `<h3> Mã OTP: ${OTP}</h3>`;
        return sendMail(from, to, subject, html);
    },
}