import { collection, doc, setDoc, addDoc, getDocs, query, where } from "firebase/firestore/lite";
import { db } from "../config/firebase.js";
import translateController from "./translateController.js";
import Chat from "../models/chat.js";
import admin from "firebase-admin";
import Message from "../models/message.js";

const handleCreateChat = async (req, res) => {
    try {
        const { receiverId, senderId, content } = req.body;
        if (!receiverId || !senderId || !content) {
            return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
        }

        // Kiểm tra xem cuộc trò chuyện đã tồn tại chưa
        let chat = await Chat.findOne({ participants: { $all: [senderId, receiverId] } });

        if (!chat) {
            chat = new Chat({ participants: [senderId, receiverId] });
            await chat.save();
        }

        // Lưu tin nhắn vào MongoDB
        const newMessage = new Message({
            content: content,
            id_sender: senderId,
            chatId: chat._id
        });
        await newMessage.save();

        let chatRef;
        const chatsSnapshot = await db.collection("chat")
            .where("users", "array-contains", senderId)
            .get();
        let existingChatId = null;

        chatsSnapshot.forEach(doc => {
            const chatData = doc.data();
            if (chatData.users.includes(receiverId)) {
                existingChatId = doc.id;
            }
        })

        if (existingChatId) {
            chatRef = db.collection("chat").doc(existingChatId);
        } else {
            // Lưu cuộc trò chuyện vào Firebase
            chatRef = db.collection("chat").doc();
            await chatRef.set({
                users: [senderId, receiverId],
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Lưu tin nhắn vào Firestore    
        const messageRef = db.collection("chat").doc(chatRef.id).collection("messages");

        await messageRef.add({
            senderId,
            content,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

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

        // Lưu tin nhắn vào MongoDB
        const newMessage = new Message({
            content: content,
            id_sender: senderId,
            chatId: chatId
        });
        await newMessage.save();


        let chatRef = db.collection("chat").doc(chatId);
        const chatDoc = await chatRef.get();

        if (!chatDoc.exists) {
            const chatsSnapshot = await db.collection("chat")
                .where("users", "array-contains", senderId)
                .get();
            let existingChatId = null;
            chatsSnapshot.forEach(doc => {
                const chatData = doc.data();
                if (chatData.users.includes(senderId)) {
                    existingChatId = doc.id;
                }
            });
            if (!existingChatId) {
                return res.status(400).json({ error: "Không tìm thấy cuộc trò chuyện" });
            }

            chatRef = db.collection("chat").doc(existingChatId);
        }

        // Lưu tin nhắn vào Firestore
        const messageRef = chatRef.collection("messages");

        await messageRef.add({
            senderId,
            content,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ message: "Tin nhắn đã được gửi thành công!" });

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
export default {
    handleSendMessage, handleCreateChat, handleGetMessages, getMessages
};
