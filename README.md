<h1 align="center">ỨNG DỤNG HỖ TRỢ GHI NHỚ TỪ VỰNG TIẾNG ANH </h1>
<p align="center">
 ỨNG DỤNG HỖ TRỢ GHI NHỚ TỪ VỰNG TIẾNG ANH HIỆU QUẢ BẰNG KOTLIN VÀ NODEJS.
  <br />
  <em>Kotlin + Node.js + MongoDB | Auth | Flashcards | Quiz</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-developing-blue" alt="status" />
  <img src="https://img.shields.io/badge/client-kotlin-orange" alt="client" />
  <img src="https://img.shields.io/badge/backend-node.js-yellowgreen" alt="backend" />
  <img src="https://img.shields.io/badge/database-mongodb_&_firebase-lightgrey" alt="database" />
</p>

---

## ✨ Giới thiệu

**Talk Bilingually** là một ứng dụng học từ vựng song ngữ giúp người học tiếng Anh mở rộng vốn từ vựng một cách hiệu quả. Ứng dụng cho phép:
- Tra cứu từ vựng và lưu từ yêu thích
- Học và ôn luyện từ yêu thích bằng Flashcards,
- Làm quiz để kiểm tra khả năng ghi nhớ
- Thống kê tiến độ học tập cá nhân.

---

## 🔧 Công nghệ sử dụng

| Thành phần     | Công nghệ sử dụng                              |
|----------------|------------------------------------------------|
| Android App    | Kotlin, MVVM, Retrofit, Firebase, ViewModel    |
| Backend        | Node.js, Express, JWT, Bcrypt, Cloudinary      |
| Database       | MongoDB, Mongoose                              |
| Ảnh đại diện   | Cloudinary                                     |

---

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

```bash
cd server
npm install
npm run dev
```
##### 1. Mở dự án trong Android Studio
Mở Visual studio code.

Chọn Open an existing project và chọn thư mục server
Cài đặt dependencies:
npm install
npm run dev

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

#### 3. Start the development server:
npm start.
---

## 🤝 Đóng góp

1. Fork repo
2. Tạo nhánh mới (`git checkout -b feature/tinh-nang-moi`)
3. Commit thay đổi (`git commit -am 'Add tính năng mới'`)
4. Push lên branch (`git push origin feature/tinh-nang-moi`)
5. Tạo pull request

---

## 📄 License

Phát hành theo giấy phép MIT. Tự do sử dụng cho học tập và phát triển.

---

## 📬 Liên hệ

**Tác giả:** Trần Lê Thảo Vy
**Email:** lethaovytran7@gmail.com  
**GitHub:** [@vylam12](https://github.com/vylam12))
