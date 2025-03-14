import admin from "firebase-admin";
// import serviceAccount from "./firebase-key.json" assert { type: "json" };

const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://myapplication-66391.firebaseio.com"
    })
};

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
