import { db } from "../config/firebase.js";
import translateController from "./translateController.js";
import Chat from "../models/chat.js";
import admin from "firebase-admin";
import translate from '@iamtraction/google-translate';
import User from "../models/user.js";
import Message from "../models/message.js";
// KIỂM TRA CUỘC TRÒ CHUYỆN TỒN TẠI
const checkExistingChat = async (req, res) => {
    try {
        const { receiverId, senderId } = req.body;
        console.log("checkExistingChat", receiverId, senderId)
        let chat = await Chat.findOne({ participants: { $all: [senderId, receiverId] } });
        if (!chat) {
            return res.status(400).json({ error: "Không tồn tại cuộc trò chuyện" });
        }
        res.status(201).json({ chatId: chat._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
}
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

        const chatId = generateChatId(senderId, receiverId);

        const chatRef = admin.firestore().collection('chat').doc(chatId);
        const chatSnapshot = await chatRef.get();

        // Tạo chat trước nếu không tồn tại
        if (!chatSnapshot.exists) {
            await chatRef.set({
                participants: [senderId, receiverId],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        console.time("TranslateTime");
        // Tiến hành dịch song song với việc tạo tin nhắn
        const translatePromise = translate(content, { to: 'en' });

        // Tạo tin nhắn ngay sau khi chat được tạo
        const messageRef = chatRef.collection("messages").doc();
        await messageRef.set({
            senderId,
            content,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            isRead: false,
        });

        const translatedResult = await translatePromise;
        const translatedContent = translatedResult.text;

        console.timeEnd("TranslateTime");

        // ✅ Trả kết quả cho client NGAY LẬP TỨC
        console.timeEnd("chatCreationTime");
        res.status(201).json({
            message: "Tin nhắn đã được tạo thành công!",
            chatId,
            translatedContent
        });

        // 👇 Gửi notification sau mà không chặn response
        (async () => {
            try {
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
                    console.log("Notification sent!");
                }
            } catch (notifyError) {
                console.error("Lỗi khi gửi notification:", notifyError);
            }
        })();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
};



//TẠO TIN NHẮN
// const handleCreateChat = async (req, res) => {
//     try {
//         console.time("chatCreationTime");
//         const { receiverId, senderId, content } = req.body;
//         if (!receiverId || !senderId || !content) {
//             return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
//         }

//         const translatePromise = translate(content, { to: 'en' });


//         // let translatedContent = content;

//         // const translatedResult = await translate(content, { to: 'en' });
//         // console.log("Translate time:", (Date.now() - start) / 1000, 's');
//         // translatedContent = translatedResult.text;
//         // console.log("Content sau khi dịch:", translatedContent);

//         const chatRef = admin.firestore().collection('chat');
//         let chatDoc = await chatRef.where('participants', 'in', [senderId, receiverId]).get();
//         if (chatDoc.empty) {
//             const newChatRef = chatRef.doc();
//             await newChatRef.set({
//                 participants: [senderId, receiverId],
//                 createdAt: admin.firestore.FieldValue.serverTimestamp(),
//             });

//             chatDoc = await newChatRef.get();
//         }
//         console.time("TranslateTime");
//         const translatedResult = await translatePromise;
//         const translatedContent = translatedResult.text;
//         console.timeEnd("TranslateTime");

//         const chatId = chatDoc.id;
//         const messageRef = chatRef.doc(chatId).collection("messages").doc();

//         await messageRef.set({
//             senderId,
//             content,
//             translatedContent,
//             timestamp: admin.firestore.FieldValue.serverTimestamp(),
//             isRead: false,
//         });

//         console.timeEnd("chatCreationTime");
//         res.status(201).json({
//             message: "Tin nhắn đã được tạo thành công!",
//             chatId: chatId,
//             translatedContent: translatedContent
//         });

//         // let notificationPromise = Promise.resolve();
//         // const sender = await User.findOne({ id: senderId });
//         // const receiver = await User.findOne({ id: receiverId });
//         const [sender, receiver] = await Promise.all([
//             User.findOne({ id: senderId }),
//             User.findOne({ id: receiverId }),
//         ]);
//         // Kiểm tra xem receiver có fcmToken không, nếu có thì gửi thông báo
//         if (receiver?.fcmToken) {
//             const message = {
//                 notification: {
//                     title: `${sender.fullname}`,
//                     body: translatedContent
//                 },
//                 data: {
//                     image: sender.avatar
//                 },
//                 token: receiver.fcmToken
//             };


//             await admin.messaging().send(message);

//         }




//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Lỗi server" });
//     }
// };





//GỬI TIN NHẮN
const handleSendMessage = async (req, res) => {
    try {
        const { chatId, senderId, content } = req.body;
        if (!chatId || !senderId || !content) {
            return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
        }

        let translatedContent = content;

        const translatedResult = await translate(content, { to: 'en' });
        translatedContent = translatedResult.text;


        const newMessage = new Message({
            content: content,
            translatedContent: translatedContent,
            id_sender: senderId,
            chatId: chatId
        });
        await newMessage.save();

        let chatRef = db.collection("chat").doc(chatId);
        const messageRef = chatRef.collection("messages").doc(newMessage._id.toString());
        await messageRef.set({
            senderId,
            content,
            translatedContent,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            isRead: false
        });
        console.log("Luu firebase thanh cong");

        const chat = await Chat.findById(chatId);
        const receiverId = chat.participants.find(id => id !== senderId);
        const receiver = await User.findOne({ id: receiverId });
        const sender = await User.findOne({ id: senderId });

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
            console.log("Notification sent!");
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
//XÓA TIN NHẮN
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

export default {
    handleSendMessage, handleCreateChat, handleGetMessages, getMessages,
    getListChat, checkExistingChat, handleDeleteChat, saveFCMToken
};
