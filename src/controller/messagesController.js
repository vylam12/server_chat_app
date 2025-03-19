import { db } from "../config/firebase.js";
import translateController from "./translateController.js";
import Chat from "../models/chat.js";
import admin from "firebase-admin";
import User from "../models/user.js";
import Message from "../models/message.js";

const checkExistingChat = async (req, res) => {
    try {
        const { receiverId, senderId } = req.body;
        console.log("checkExistingChat", receiverId, senderId)

        const chatRef = admin.firestore().collection('chat');
        const messagesRef = chatRef.where('users', 'array-contains', senderId).where('users', 'array-contains', receiverId);
        console.log("messagesRef", messagesRef)
        const snapshot = await messagesRef.get();

        if (snapshot.empty) {
            return res.status(400).json({ error: "Không tồn tại cuộc trò chuyện" });
        }
        const chatDoc = snapshot.docs[0];
        const chatId = chatDoc.id;
        console.log("chatId", chatId)
        res.status(201).json({ chatId: chatId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }

}
const handleCreateChat = async (req, res) => {
    try {
        const { receiverId, senderId, content } = req.body;
        if (!receiverId || !senderId || !content) {
            return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
        }

        let translatedContent = content;
        if (/[\u00C0-\u1EF9]/.test(content)) {
            translatedContent = await translateController.translate(content, "en", "vi");
        }

        // Kiểm tra xem cuộc trò chuyện đã tồn tại chưa
        let chat = await Chat.findOne({ participants: { $all: [senderId, receiverId] } });

        if (!chat) {
            chat = new Chat({ participants: [senderId, receiverId] });
            await chat.save();
        }

        // Lưu tin nhắn vào MongoDB
        const newMessage = new Message({
            content,
            translatedContent,
            id_sender: senderId,
            chatId: chat._id
        });
        await newMessage.save();

        // Kiểm tra xem Firestore đã có cuộc trò chuyện chưa
        const chatRef = db.collection("chat").doc(chat._id.toString());
        const chatSnapshot = await chatRef.get();

        if (!chatSnapshot.exists) {
            await chatRef.set({
                users: [senderId, receiverId],
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Lưu tin nhắn vào Firestore    
        const messageRef = chatRef.collection("messages");
        await messageRef.doc(newMessage._id.toString()).set({
            senderId,
            content,
            translatedContent,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("Tạo tin nhắn thành công");
        res.status(201).json({ message: "Chat và tin nhắn đã được tạo thành công!", chatId: chat._id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
};


const markMessageAsRead = async (req, res) => {
    try {
        const { chatId, userId } = req.body;

        const updatedMessages = await Message.updateMany(
            { chatId, isRead: false, id_sender: { $ne: userId } }, // Chỉ cập nhật tin nhắn chưa đọc của người khác gửi
            { isRead: true }
        );

        res.status(200).json({ message: "Tất cả tin nhắn đã được đọc", updatedCount: updatedMessages.modifiedCount });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi cập nhật tin nhắn", error });
    }
}

const handleSendMessage = async (req, res) => {
    try {
        const { chatId, senderId, content } = req.body;
        if (!chatId || !senderId || !content) {
            return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
        }

        let translatedContent = content;
        if (/[\u00C0-\u1EF9]/.test(content)) {
            translatedContent = await translateController.translate(content, "en", "vi");
        }

        // Lưu tin nhắn vào MongoDB
        const newMessage = new Message({
            content,
            translatedContent,
            id_sender: senderId,
            chatId,
            isRead: false
        });
        await newMessage.save();

        // Kiểm tra chat trên Firestore
        const chatRef = db.collection("chat").doc(chatId);
        const chatSnapshot = await chatRef.get();

        if (!chatSnapshot.exists) {
            return res.status(400).json({ error: "Chat không tồn tại trên Firestore" });
        }

        // Lưu tin nhắn vào Firestore    
        await chatRef.collection("messages").doc(newMessage._id.toString()).set({
            senderId,
            content,
            translatedContent,
            isRead: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Gửi thông báo
        const chat = await Chat.findById(chatId).populate("participants", "fcmToken");
        const receiver = chat.participants.find(user => user._id.toString() !== senderId);

        if (receiver?.fcmToken) {
            await sendPushNotification(receiver.fcmToken, {
                title: "New Message from ChatApp",
                body: content,
                chatId
            });
        }

        res.status(201).json({
            message: "Tin nhắn đã được gửi thành công!",
            newMessage: newMessage.toObject(),
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
};


const handleGetMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        if (!chatId) {
            return res.status(400).json({ error: "Thiếu chatId" });
        }

        // Lấy tin nhắn từ MongoDB
        const messages = await Message.find({ chatId }).sort({ createdAt: 1 });

        res.status(200).json({
            mongoMessages: messages
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

const getMessagesFromFirestore = async (chatId) => {
    try {
        if (!chatId) {
            throw new Error("Thiếu chatId");
        }

        // Truy vấn Firestore
        const messageRef = db.collection("chat").doc(chatId).collection("messages");
        const snapshot = await messageRef.orderBy("timestamp", "asc").get();

        // Chuyển dữ liệu thành mảng
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return messages;

    } catch (error) {
        console.error("Lỗi lấy tin nhắn từ Firestore:", error);
        return [];
    }
};

const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        if (!chatId) {
            return res.status(400).json({ error: "Thiếu chatId" });
        }

        const messages = await getMessagesFromFirestore(chatId);

        res.status(200).json({ messages });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
};
const getListChat = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "Thiếu userId" });
        }

        const chats = await Chat.find({ participants: userId })
            .sort({ createdAt: -1 })
            .populate("participants", "fullname avatar"); // Lấy thông tin người tham gia

        if (!chats.length) {
            return res.status(200).json({ listChat: [] });
        }

        const listChat = await Promise.all(chats.map(async (chat) => {
            const lastMessage = await Message.findOne({ chatId: chat._id })
                .sort({ createdAt: -1 }) // Sửa lỗi typo `createAt` thành `createdAt`
                .populate("id_sender", "fullname avatar")
                .lean();

            const unreadCount = await Message.countDocuments({
                chatId: chat._id,
                id_sender: { $ne: userId },
                isRead: false
            });

            return {
                chatId: chat._id,
                participants: chat.participants.map(user => ({
                    id: user._id,
                    fullname: user.fullname,
                    avatar: user.avatar
                })), // Danh sách tất cả người tham gia
                lastMessage: lastMessage ? lastMessage.translatedContent : null,
                lastMessageTime: lastMessage ? lastMessage.createdAt : null,
                unreadCount: unreadCount,
                sender: lastMessage?.id_sender ? {
                    id: lastMessage.id_sender._id,
                    fullname: lastMessage.id_sender.fullname
                } : null
            }
        }));

        console.log("Lấy danh sách chat:", listChat);

        res.status(200).json({
            listChat: listChat
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

const handleDeleteChat = async (req, res) => {
    try {
        const { chatId } = req.body;
        if (!chatId) {
            return res.status(400).json({ error: "Thiếu chatId" });
        }
        await Chat.findByIdAndDelete(chatId);
        await Message.deleteMany({ chatId });

        const chatRef = db.collection("chat").doc(chatId);
        const messagesRef = chatRef.collection("messages");

        const messagesSnapshot = await messagesRef.get();
        const batch = db.batch();
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        batch.delete(chatRef);
        await batch.commit();

        res.status(200).json({ message: "Cuộc trò chuyện đã được xóa thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
}

const saveFCMToken = async (req, res) => {
    try {
        const { userId, fcmToken } = req.body;
        if (!userId || !fcmToken) {
            return res.status(400).json({ error: "Missing userId or fcmToken" })
        }

        await User.findByIdAndUpdate(userId, { fcmToken });
        res.status(200).json({ message: "FCM Token đã được cập nhật" });

    } catch (error) {

    }
}
export default {
    handleSendMessage, handleCreateChat, handleGetMessages, getMessages,
    getListChat, checkExistingChat, handleDeleteChat, saveFCMToken
};
