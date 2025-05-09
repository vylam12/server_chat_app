<h1 align="center">ỨNG DỤNG TRÒ CHUYỆN SONG NGỮ </h1>
<p align="center">
 ỨNG DỤNG TRÒ CHUYỆN SONG NGỮ BẰNG KOTLIN VÀ NODEJS.
  <br />
  <em>Kotlin + Node.js + MongoDB + Firebase | Auth | Chat | Translate | Add Friend</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-developing-blue" alt="status" />
  <img src="https://img.shields.io/badge/client-kotlin-orange" alt="client" />
  <img src="https://img.shields.io/badge/backend-node.js-yellowgreen" alt="backend" />
  <img src="https://img.shields.io/badge/database-mongodb_&_firebase-lightgrey" alt="database" />
</p>

---

## ✨ Giới thiệu

**Talk Bilingually** là một ứng dụng trò chuyện song ngữ. Ứng dụng cho phép:
- Đăng nhập, đăng ký, khôi phục mật khẩu
- Tìm kiếm cuộc trò chuyện
- Nhắn tin với bạn bè
- Dịch tin nhắn
- Tìm kiếm và kết bạn, hủy kết bạn



---

## 🔧 Công nghệ sử dụng

| Thành phần     | Công nghệ sử dụng                              |
|----------------|------------------------------------------------|
| Android App    | Kotlin, MVVM, Retrofit, Firebase, ViewModel    |
| Backend        | Node.js, Express, JWT, Bcrypt, Cloudinary      |
| Database       | MongoDB, Mongoose, Firebase                    |
| Ảnh đại diện   | Cloudinary                                     |

---
---
## 🚀 Cấu trúc project
```
191-Trần Lê Thảo Vy-21CNTT4/
├── MyApplication/ # Ứng dụng Android (Kotlin)
├── server/ # Backend Node.js
└── README.md

## 🚀 Cài đặt & chạy ứng dụng


### 🔹 1. Cài đặt client
#### 1. Mở dự án trong Android Studio
Mở Android Studio.

Chọn Open an existing project và chọn thư mục MyApplication

Android Studio sẽ tự động tải xuống các dependencies cần thiết.
#### 2. Cấu hình Firebase:
Để kết nối với Firebase, bạn cần thực hiện các bước sau:

Tạo một project Firebase tại Firebase Console.

Thêm ứng dụng Android của bạn vào Firebase (nhập thông tin package name của ứng dụng).

Tải file google-services.json từ Firebase và đặt nó vào thư mục app/ trong dự án Android.
#### 3. Cấu hình API URL
Trong RetrofitClient.kt của ứng dụng, bạn cần cập nhật URL của server API:
const val BASE_URL = "http://your-server-ip:9000/"
#### 4. Chạy ứng dụng
Sau khi đã cấu hình xong, bạn chỉ cần nhấn Run trong Android Studio để chạy ứng dụng trên thiết bị thật hoặc emulator.
### 🔹 2. Cài đặt server

##### 1. Mở dự án trong Visual studio code
Mở Visual studio code.

Chọn File>Open foler và chọn thư mục server
Cài đặt server:
npm install
npm run dev
```

#### 2. Tạo file `.env` trong thư mục `server`

```env
MONGO_URI=mongodb+srv://root123:<db_password>@quizapp.lx5nz.mongodb.net/?retryWrites=true&w=majority&appName=quizapp
EMAIL_USERNAME=
EMAIL_PASSWORD=
JWT_SECRET=
PORT=9000
GOOGLE_CLIENT_ID=
FIREBASE_CREDENTIALS=
APP_ID=
CLOUDINARY_URL=
```

#### 3. Chạy server:
```
npm start.
```
---

## 📄 License

Phát hành theo giấy phép MIT. Tự do sử dụng cho học tập và phát triển.

---

## 📬 Liên hệ

**Tác giả:** Trần Lê Thảo Vy
**Email:** lethaovytran7@gmail.com  
**GitHub:** [@vylam12](https://github.com/vylam12))
