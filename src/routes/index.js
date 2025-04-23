import express from "express";
import multer from 'multer';
import translateController from "../controller/translateController.js";
import quizController from "../controller/quizController.js";
import authController from "../controller/authController.js";
import friendInvitationController from "../controller/friendInvitationController.js";
import messageController from "../controller/messagesController.js";
import userController from "../controller/userController.js";
import vocabularyController from "../controller/vocabularyController.js";


const upload = multer({ dest: 'uploads/' });
const router = express.Router();

const initWebRoutes = (app) => {
    router.post("/translate", translateController.handleTranslate)

    router.post("/findVocabulary", vocabularyController.handleFindVocabulary)
    router.post("/saveVocabulary", vocabularyController.handleSaveVocabulary)
    router.get("/get-list-saveVocab/:userId", vocabularyController.handleGetListSaveVocab)
    router.post("/deleteVocabulary", vocabularyController.handleDeleteVocabulary)
    //làm flashcard để học từ vựng
    router.get("/getVocab/:userId", vocabularyController.getUserVocabulary)
    router.post("/update-after-flashcard", vocabularyController.updateAfterFlashcard)
    //làm flashcard ôn 
    router.get("/flashcard-review/:userId", vocabularyController.getFlashcardReviewQuestions);
    router.get("/progress/:userId", vocabularyController.getProgress);
    //dùng lấy để ôn nhắc nhở
    router.get("/review-vocab/:userId", vocabularyController.handleGetVocabToReview);

    router.get("/get-history-quiz/:userId", quizController.handleGetHistoryQuiz)
    router.get("/generate-quiz/:userId", quizController.handleQuizCreation)
    router.get("/get-quiz/:quizId", quizController.handleGetQuiz)
    router.post("/update-result-quiz", quizController.handleUpdateResultQuiz)
    router.post("/check-user-vocabulary", quizController.handleCheckUserVocabulary);

    router.post("/register", authController.handleRegister)
    router.post("/login", authController.handleLogin)
    router.post("/forgot-password-otp", authController.handleForgotPassword)
    router.post("/verify-otp", authController.verifyOTP)
    router.post("/reset-password", authController.hanleResetPasswordWithOTP)

    //gửi lời mời kết bạn
    router.post("/friend-invited", friendInvitationController.handleInvited)
    router.post("/accept-friend-invited", friendInvitationController.handleAcceptInvited)
    router.post("/unfriend", friendInvitationController.handleUnfriend)
    //lấy list bạn bè
    router.get("/get-friend/:userId", friendInvitationController.handleGetFriend)
    //lấy list lời mời kết bạn
    router.get("/get-friend-invited/:userId", friendInvitationController.handleGetFriendInvited)

    router.post("/create-chat", messageController.handleCreateChat)
    router.post("/send-message", messageController.handleSendMessage)
    router.get("/get-message/:chatId", messageController.handleGetMessages)
    router.get("/messages/:chatId", messageController.getMessages)
    router.get("/get-list-chat/:userId", messageController.getListChat)
    router.post("/delete-chat", messageController.handleDeleteChat)
    router.post("/check-exist-chat", messageController.checkExistingChat)
    router.post("/save-fcm-token", messageController.saveFCMToken)

    router.get("/users/:userId", userController.handleGetUser)
    router.get("/get-infor-user/:userId", userController.handleGetIFUser)
    router.post("/update-user", upload.single('avatar'), userController.hanldeUpdateUser)

    router.get("/get-idUser/:userId", userController.handleGetIDUser)
    router.get("/find-friend", userController.handleFindFriend)

    router.get("/find-user", userController.handleFriendUser)

    return app.use("/", router);
}


export default initWebRoutes;