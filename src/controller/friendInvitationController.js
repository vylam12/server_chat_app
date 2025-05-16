import FriendInvitation from "../models/friendInvitation.js";
import User from "../models/user.js";
import admin from "firebase-admin";
//gửi lời mời
const handleInvited = async (req, res) => {
    try {
        const { idSender, idReciver } = req.body;

        const newInvited = new FriendInvitation({
            id_receiver: idReciver,
            id_sender: idSender,
            status: "pending"
        })
        await newInvited.save();

        const receiver = await User.findById(idReciver);
        const sender = await User.findById(idSender);
        if (receiver && receiver.fcmToken) {
            const message = {
                notification: {
                    title: "New friend request",
                    body: `You have a friend request from ${sender.fullname}`
                },
                token: receiver.fcmToken
            };

            await admin.messaging().send(message);
            console.log("Notification sent!");
        }

        res.json({ message: "Invited friend created!", newInvited })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
// const handleAcceptInvited = async (req, res) => {
//     try {
//         const { idSender, idReciver, status } = req.body;

//         const invitedUpdate = await FriendInvitation.findOneAndUpdate(
//             { id_receiver: idReciver, id_sender: idSender },
//             { status: status },
//             { new: true }
//         );

//         const sender = await User.findById(idSender);
//         const receiver = await User.findById(idReciver);
//         if (sender && sender.fcmToken) {
//             const message = {
//                 notification: {
//                     title: "Friend request update",
//                     body: status === "accepted"
//                         ? `${receiver.fullname} accepted your friend request!`
//                         : `${receiver.fullname} declined your friend request.`
//                 },
//                 token: sender.fcmToken
//             };

//             await admin.messaging().send(message);
//             console.log("Notification sent to sender!");
//         }

//         res.json({ message: "Invited friend updated!", invited: invitedUpdate })
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// }

const handleAcceptInvited = async (req, res) => {
    try {
        const { idSender, idReciver, status } = req.body;

        if (!idSender || !idReciver || !status) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Cập nhật lời mời
        const invitedUpdate = await FriendInvitation.findOneAndUpdate(
            { id_receiver: idReciver, id_sender: idSender },
            { status },
            { new: true }
        ).lean(); // dùng lean để trả về plain object

        if (!invitedUpdate) {
            return res.status(404).json({ error: "Invitation not found" });
        }

        // Lấy thông tin receiver và sender cùng lúc
        const [sender, receiver] = await Promise.all([
            User.findById(idSender).lean(),
            User.findById(idReciver).lean()
        ]);

        // Gửi thông báo nếu có token
        if (sender?.fcmToken && receiver) {
            const message = {
                notification: {
                    title: "Friend request update",
                    body: status === "accepted"
                        ? `${receiver.fullname} accepted your friend request!`
                        : `${receiver.fullname} declined your friend request.`
                },
                token: sender.fcmToken
            };

            // Gửi push notification
            await admin.messaging().send(message);
            console.log("Notification sent to sender!");
        }

        return res.json({
            message: "Friend invitation status updated!",
            invited: invitedUpdate
        });

    } catch (error) {
        console.error("Lỗi khi xử lý lời mời:", error);
        return res.status(500).json({ error: error.message });
    }
};


const handleGetFriend = async (req, res) => {
    try {
        const { userId } = req.params;
        const status = "accepted";

        if (!userId) {
            return res.status(400).json({ error: "Thiếu userId" });
        }

        // Lấy tất cả các lời mời bạn bè đã accepted
        const friends = await FriendInvitation.find({
            $or: [
                { id_sender: userId },
                { id_receiver: userId }
            ],
            status
        }).lean(); // dùng lean() để tăng tốc

        // Lọc ra ID bạn bè (người còn lại)
        const friendIds = friends.map(friend =>
            friend.id_sender.toString() === userId
                ? friend.id_receiver
                : friend.id_sender
        );

        // Nếu không có bạn bè thì trả sớm
        if (friendIds.length === 0) {
            return res.status(200).json({ friend: [] });
        }

        // Lấy thông tin bạn bè
        const friendDetails = await User.find(
            { _id: { $in: friendIds } },
            { email: 1, fullname: 1, avatar: 1 }
        ).lean();

        return res.status(200).json({ friend: friendDetails });

    } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè:", error);
        return res.status(500).json({ error: error.message });
    }
};

const handleGetFriendInvited = async (req, res) => {
    try {
        const { userId } = req.params;

        const status = "pending";
        if (!userId) {
            return res.status(400).json({ error: "Thiếu userId" });
        }

        const invitations = await FriendInvitation.find({
            id_receiver: userId,
            status: status
        }).sort({ createdAt: 1 });

        const senderIds = invitations.map(invite => invite.id_sender);

        const senders = await User.find({ _id: { $in: senderIds } }).select("fullname email avatar")

        const friendInvitations = invitations.map(invite => {
            const senderInfo = senders.find(user => user._id.toString() === invite.id_sender.toString())

            return {
                _id: invite._id,
                senderId: invite.id_sender,
                receiverId: invite.id_receiver,
                status: invite.status,
                createdAt: invite.createdAt,
                senderInfo: senderInfo
            }
        })
        console.log(friendInvitations);



        res.status(200).json({
            friend: friendInvitations
        });


    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const isFriend = async (userId, friendId) => {
    if (!userId || !friendId) return false;

    const friendship = await FriendInvitation.findOne({
        $or: [
            { id_sender: userId, id_receiver: friendId, status: "accepted" },
            { id_sender: friendId, id_receiver: userId, status: "accepted" }
        ]
    });
    const isFriend = !!friendship;

    return res.status(200).json({ friendship: isFriend.toString() });
};
const handleUnfriend = async (req, res) => {
    const { idUser, idFriend } = req.body;

    console.log("handleUnfriend: ", idUser, "   ", idFriend)

    const deleted = await FriendInvitation.findOneAndDelete({
        $or: [
            { id_sender: idFriend, id_receiver: idUser, status: "accepted" },
            { id_sender: idUser, id_receiver: idFriend, status: "accepted" }
        ]
    });

    if (!deleted) {
        console.log("Friendship not found")
        return res.status(404).json({ message: "Friendship not found" });
    } else {
        console.log("Đã xóa thành công:", deleted);
    }
    return res.status(200).json({ message: "Unfriended successfully" });
};
export default {
    handleInvited, handleAcceptInvited, handleGetFriend, handleGetFriendInvited,
    isFriend, handleUnfriend
};
