import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true, unique: true
    },
    email: {
        type: String, required: true,
        unique: true
    },
    avatar: {
        type: String,
        default: null
    },
    fullname: {
        type: String, required: true,
    },
    gender: {
        type: String,
        default: null
    },
    birthDay: {
        type: Date,
        default: null
    },
    resetOtp: {
        type: String, default: null
    },
    otpExpires: {
        type: Date, default: null
    },
    fcmToken: {
        type: String,
        default: null
    }

},
    { timestamps: true }
)

const User = mongoose.model("user", userSchema);
export default User;