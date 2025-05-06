import { db } from "../config/firebase.js";
import admin from "firebase-admin";
import translate from '@iamtraction/google-translate';
import User from "../models/user.js";
// KIỂM TRA CUỘC TRÒ CHUYỆN TỒN TẠI
const checkExistingChat = async (req, res) => {
    try {
        const { receiverId, senderId } = req.body;
        console.log("checkExistingChat", receiverId, senderId)
        const chat = await admin.firestore().collection('chat')
            .where('participants', 'array-contains', senderId)
            .get();

        const existingChats = chat.docs.filter(doc => doc.data().participants.includes(receiverId));


        if (!chat) {
            return res.status(400).json({ error: "Không tồn tại cuộc trò chuyện" });
        }
        const chatId = existingChats[0].id;
        res.status(201).json({ chatId: chatId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
}
// tạo id chat
const generateChatId = (id1, id2) => {
    return [id1, id2].sort().join('_');
};

const handleCreateChat = async (req, res) => {
    try {
        console.time("chatCreationTime");

        const { receiverId, senderId, content } = req.body;
        if (!receiverId || !senderId || !content) {
            return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
        }

        const translatePromise = translate(content, { to: 'en' });
        const chatId = generateChatId(senderId, receiverId);

        const chatRef = admin.firestore().collection('chat').doc(chatId);
        const chatSnapshot = await chatRef.get();

        if (!chatSnapshot.exists) {
            await chatRef.set({
                participants: [senderId, receiverId],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        console.time("TranslateTime");
        const translatedResult = await translatePromise;
        const translatedContent = translatedResult.text;
        console.timeEnd("TranslateTime");

        const messageRef = chatRef.collection("messages").doc();
        await messageRef.set({
            senderId,
            content,
            translatedContent,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            isRead: false,
        });

        console.timeEnd("chatCreationTime");

        res.status(201).json({
            message: "Tin nhắn đã được tạo thành công!",
            chatId,
            translatedContent
        });

        // Gửi notification sau khi response
        const [sender, receiver] = await Promise.all([
            User.findOne({ id: senderId }),
            User.findOne({ id: receiverId }),
        ]);

        if (receiver?.fcmToken) {
            const message = {
                notification: {
                    title: `${sender.fullname}`,
                    body: translatedContent
                },
                data: {
                    image: sender.avatar
                },
                token: receiver.fcmToken
            };

            await admin.messaging().send(message);
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

//GỬI TIN NHẮN
const handleSendMessage = async (req, res) => {
    try {
        console.time("sendChat");
        const { chatId, senderId, content } = req.body;
        if (!chatId || !senderId || !content) {
            return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
        }
        const translatePromise = translate(content, { to: 'en' });

        const chatRef = admin.firestore().collection('chat').doc(chatId);
        console.time("⏱ Dịch nội dung");
        const translatedResult = await translatePromise;
        const translatedContent = translatedResult.text;
        console.timeEnd("⏱ Dịch nội dung");

        console.time("⏱ Lưu Firestore");
        const messageRef = chatRef.collection("messages").doc();
        await messageRef.set({
            senderId,
            content,
            translatedContent,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            isRead: false,
        });

        console.timeEnd("sendChat");
        console.timeEnd("⏱ Lưu Firestore");
        res.status(201).json({
            message: "Tin nhắn đã được gửi thành công!",
            translatedContent,
        });

        (async () => {
            console.time("⏱ Truy vấn MongoDB + Gửi FCM");
            try {
                const chatSnapshot = await chatRef.get();
                const chatData = chatSnapshot.data();
                const receiverId = chatData.participants.find(id => id !== senderId);

                const [sender, receiver] = await Promise.all([
                    User.findOne({ id: senderId }),
                    User.findOne({ id: receiverId }),
                ]);

                if (receiver?.fcmToken) {
                    const message = {
                        notification: {
                            title: `${sender.fullname}`,
                            body: translatedContent,
                        },
                        data: {
                            image: sender.avatar,
                        },
                        token: receiver.fcmToken,
                    };
                    await admin.messaging().send(message);
                }
                console.timeEnd("⏱ Truy vấn MongoDB + Gửi FCM");
            } catch (err) {
                console.error("Lỗi khi gửi FCM:", err);
            }
        })();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

const handleDeleteChat = async (req, res) => {
    try {
        const { chatId, userId, deleteUntil } = req.body;
        if (!chatId || !userId) {
            return res.status(400).json({ error: "Thiếu chatId hoặc userId" });
        }

        if (deleteUntil) {
            const chatRef = db.collection("chats").doc(chatId);
            const userRef = chatRef.collection("participants").doc(userId);
            await userRef.update({
                deleteUntil: deleteUntil
            });
            return res.status(200).json({ message: "Mốc xóa đã được lưu cho người dùng" });
        }
        DeleteMessages(chatId)
        res.status(200).json({ message: "Không có mốc xóa nào được cung cấp" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
}
const DeleteMessages = async (chatId) => {
    try {
        const chatRef = db.collection("chats").doc(chatId);
        const participantsRef = chatRef.collection("participants");

        const participantsSnapshot = await participantsRef.get();
        const deleteUntilTimes = [];

        participantsSnapshot.forEach(doc => {
            const participantData = doc.data();
            if (participantData.deleteUntil) {
                deleteUntilTimes.push(new Date(participantData.deleteUntil));
            }
        });

        if (deleteUntilTimes.length === 0) {
            return { message: "Không có mốc xóa nào được lưu cho người tham gia." };
        }

        const earliestDeleteUntil = new Date(Math.min(...deleteUntilTimes));

        const messagesRef = chatRef.collection("messages");
        const messagesSnapshot = await messagesRef.get();
        const batch = db.batch();

        messagesSnapshot.forEach(doc => {
            const messageData = doc.data();
            const messageTimestamp = new Date(messageData.timestamp);

            if (messageTimestamp >= earliestDeleteUntil) {
                batch.delete(doc.ref);
            }
        });

        await batch.commit();

        return { message: "Đã xóa các tin nhắn từ mốc xóa trở đi." };
    } catch (error) {
        console.error(error);
        return { error: "Lỗi server khi xóa tin nhắn." };
    }
};

//LƯU FCM TOKEN ĐỂ GỬI THÔNG BÁO TIN NHẮN
const saveFCMToken = async (req, res) => {
    try {
        const { userId, fcmToken } = req.body;
        console.log("FCM TOKEN", userId, fcmToken);
        if (!userId || !fcmToken) {
            return res.status(400).json({ error: "Missing userId or fcmToken" })
        }

        const user = await User.findOneAndUpdate({ id: userId }, { fcmToken }, { new: true });
        console.log("User sau khi cập nhật:", user);
        res.status(200).json({ message: "FCM Token đã được cập nhật" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
}
const handleSearchChat = async (req, res) => {
    const { userId, keyword } = req.query;

    if (!userId || !keyword) {
        return res.status(400).json({ error: 'Missing userId or keyword' });
    }

    try {
        // Lấy danh sách người dùng có tên giống keyword
        const matchedUsers = await User.find({
            fullname: { $regex: keyword, $options: "i" }
        });

        // Tạo object ánh xạ userId => fullname
        const usersData = {};
        matchedUsers.forEach(user => {
            usersData[user.id] = user.fullname;
        });

        const chatsRef = admin.firestore().collection('chat');
        const snapshot = await chatsRef.get();

        let filteredChats = [];

        snapshot.forEach(doc => {
            const chatData = doc.data();
            const participants = chatData.participants;
            const messages = chatData.messages || {};

            // Không phải chat của user thì bỏ qua
            if (!participants.includes(userId)) return;

            // Lấy ID người còn lại (receiver)
            const otherUserId = participants.find(p => p !== userId);
            const receiverName = usersData[otherUserId] || '';

            const matchByName = receiverName.toLowerCase().includes(keyword.toLowerCase());

            // Kiểm tra nội dung tin nhắn
            const matchByMessage = Object.values(messages).some(msg => {
                // Kiểm tra nếu có translatedContent và so khớp với keyword
                const translated = msg.translatedContent ? msg.translatedContent.toLowerCase() : "";
                return translated.includes(keyword.toLowerCase());
            });

            console.log("🔍 keyword:", keyword);
            console.log("📩 messages:", JSON.stringify(messages, null, 2));
            if (matchByName || matchByMessage) {
                filteredChats.push({
                    chatId: doc.id,
                    participants,
                    matchByMessage: matchByMessage || null
                });
            }
        });

        res.status(200).json(filteredChats);
    } catch (error) {
        console.error('Error searching chats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export default {
    handleSendMessage, handleCreateChat,
    checkExistingChat, handleDeleteChat, saveFCMToken, handleSearchChat
};
