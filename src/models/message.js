import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    content: {
        type: String, required: true
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true, ref: "chat"
    },
    translatedContent: { type: String },
    id_sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    }
},
    { timestamps: true }
)

const Message = mongoose.model("message", messageSchema);
export default Message;