import admin from "firebase-admin";
import axios from "axios";

// Hàm gửi thông báo FCM
export const sendPushNotification = async (fcmToken, data) => {
    try {
        const accessToken = await admin.credential.applicationDefault().getAccessToken();

        const response = await axios.post(
            "https://fcm.googleapis.com/v1/projects/myapplication-66391/messages:send",
            {
                message: {
                    token: fcmToken,
                    notification: {
                        title: data.title,
                        body: data.body,
                    },
                    data: {
                        chatId: data.chatId,
                    },
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken.access_token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("FCM Response:", response.data);
    } catch (error) {
        console.error("Lỗi gửi FCM:", error.response?.data || error.message);
    }
};
