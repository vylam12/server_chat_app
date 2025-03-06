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
    fullname: {
        type: String, required: true,
    },
    resetOtp: {
        type: String, default: null
    },
    otpExpires: {
        type: Date, default: null
    }

},
    { timestamps: true }
)

const User = mongoose.model("user", userSchema);
export default User;