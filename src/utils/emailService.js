import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    service: "gmail",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

console.log("Email Username:", process.env.EMAIL_USERNAME);
console.log("Email Password:", process.env.EMAIL_PASSWORD ? "*****" : "Not Set");

export default transporter;
