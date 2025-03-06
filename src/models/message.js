import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    content: {
        type: String, required: true
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true, ref: "chat"
    },
    id_sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
)

const Message = mongoose.model("message", messageSchema);
export default Message;