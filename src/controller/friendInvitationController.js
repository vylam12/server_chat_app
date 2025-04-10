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
const handleAcceptInvited = async (req, res) => {
    try {
        const { idSender, idReciver, status } = req.body;

        const invitedUpdate = await FriendInvitation.findOneAndUpdate(
            { id_receiver: idReciver, id_sender: idSender },
            { status: status },
            { new: true }
        );

        const sender = await User.findById(idSender);
        const receiver = await User.findById(idReciver);
        if (sender && sender.fcmToken) {
            const message = {
                notification: {
                    title: "Friend request update",
                    body: status === "accepted"
                        ? `${receiver.fullname} accepted your friend request!`
                        : `${receiver.fullname} declined your friend request.`
                },
                token: sender.fcmToken
            };

            await admin.messaging().send(message);
            console.log("Notification sent to sender!");
        }

        res.json({ message: "Invited friend updated!", invited: invitedUpdate })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
const handleGetFriend = async (req, res) => {
    try {
        const { userId } = req.params;
        const status = "accepted";
        if (!userId) {
            return res.status(400).json({ error: "Thiếu userId" });
        }

        const friends = await FriendInvitation.find({
            $or: [{ id_sender: userId }, { id_receiver: userId }],
            status: status
        }).sort({ createdAt: 1 });

        const friendIds = friends.map(friend =>
            friend.id_sender.toString() === userId ? friend.id_receiver : friend.id_sender
        );

        const friendDetails = await User.find({ _id: { $in: friendIds } }).select("email fullname avatar");
        console.log("danh sách bạn bè", friendDetails);
        res.status(200).json({
            friend: friendDetails
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

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

    return !!friendship;
};
const handleUnfriend = async (req, res) => {
    const { idUser, idFriend } = req.body;

    await FriendInvitation.findOneAndDelete({
        $or: [
            { id_sender: idFriend, id_receiver: idUser, status: "accepted" },
            { id_sender: idUser, id_receiver: idFriend, status: "accepted" }
        ]
    });

    return res.status(200).json({ message: "Unfriended successfully" });
};
export default {
    handleInvited, handleAcceptInvited, handleGetFriend, handleGetFriendInvited,
    isFriend, handleUnfriend
};
