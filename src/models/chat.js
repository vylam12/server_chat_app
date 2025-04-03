import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    participants: [{
        type: String,
        ref: "user",
        required: true
    }]
},
    { timestamps: true }
)

const Chat = mongoose.model("chat", chatSchema);
export default Chat;