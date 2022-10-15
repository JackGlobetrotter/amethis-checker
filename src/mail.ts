import nodemailer from 'nodemailer'

let mail = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.MAILADDRESS, 
        pass: process.env.MAILPASSWORD, 
    }
});

export { mail }