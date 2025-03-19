import { auth } from "../config/firebase.js";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import emailService from "../utils/emailService.js";

const handleRegister = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const fullname = req.body.fullname;

        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: fullname
        });

        const newUser = new User({
            id: userRecord.uid,
            email: userRecord.email,
            fullname: fullname
        });
        await newUser.save();

        const userRef = db.collection("users").doc(userRecord.uid);
        await userRef.set({
            id: userRecord.uid,
            email: userRecord.email,
            fullname: fullname,
            avatar: "", // Mặc định chưa có avatar
            createdAt: new Date()
        });
        res.json({ message: "User created!", uid: userRecord.uid })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
const handleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ error: "Missing ID Token" });
        } else {
            const decodedToken = await auth.verifyIdToken(idToken);
            if (!decodedToken) {
                return res.status(400).json({ error: "Invalid Token" });
            }
            const { uid, email } = decodedToken;
            let userData = await User.findOne({ id: uid })
            const token = jwt.sign({ uid, email }, process.env.JWT_SECRET, { expiresIn: "7d" });

            res.json({
                message: "Login successful!",
                token,
                user: userData
            });

        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const handleForgotPassword = async (req, res) => {
    try {
        const email = req.body.email;
        if (!email) {
            return res.status(400).json({ error: "Email is required!" })

        }
        const user = await User.findOne({ email: email })

        if (!user) {
            return res.status(400).json({ error: "User not found!" })
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 2 * 60 * 1000; //hẹn sao 2 phút
        user.resetOtp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        await emailService.sendMail({
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: "Your Password Reset OTP",
            text: `Your OTP code is: ${otp}. It will expire in 2 minutes.`
        });

        res.json({ message: "OTP sent! Please check your mail" })

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: "Email and OTP required!" })
        }

        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(400).json({ error: "User not found!" })
        }
        if (user.resetOtp !== otp || Date.now() > user.otpExpires) {
            return res.status(400).json({ error: "Invalid or expired OTP!" })
        }
        console.log("JWT Secret:", process.env.JWT_SECRET);

        const tempToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "10m" })

        user.resetOtp = null;
        user.otpExpires = null;
        await user.save();
        res.json({ message: "OTP verify! You can reset your password", token: tempToken })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const hanleResetPasswordWithOTP = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: "All fields are required!" })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { email } = decoded;

        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(400).json({ error: "User not found!" })
        }

        const userRecord = await auth.getUserByEmail(email);
        await auth.updateUser(userRecord.uid, { password: newPassword });


        res.json({ message: "Password reset successful!" })

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export default {
    handleRegister, handleLogin, handleForgotPassword,
    hanleResetPasswordWithOTP, verifyOTP
};
