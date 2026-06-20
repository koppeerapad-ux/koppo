# Firebase Authentication App 🔐

โปรเจค React พร้อม Firebase Authentication ที่สมบูรณ์ รองรับการลงทะเบียนและเข้าสู่ระบบผ่าน Email, Google, และ Discord

## ✨ ฟีเจอร์

- ✅ **Email & Password Authentication** - ลงทะเบียนและเข้าสู่ระบบด้วยอีเมล
- ✅ **Email Verification** - ยืนยันอีเมลโดยอัตโนมัติ
- ✅ **Google OAuth** - เข้าสู่ระบบด้วย Google Account
- ✅ **Discord OAuth** - เข้าสู่ระบบด้วย Discord Account
- ✅ **Password Reset** - รีเซ็ตรหัสผ่านผ่านอีเมล
- ✅ **Protected Routes** - หน้าต่าง-ต่าง ได้รับการป้องกัน
- ✅ **User Dashboard** - แสดงข้อมูลผู้ใช้
- ✅ **Responsive Design** - ออกแบบให้ใช้ได้ทั้งบนมือถือและเดสก์ทอป

## 📋 สิ่งที่ต้องเตรียม

- Node.js 16+ และ npm
- Firebase Project (สร้างได้ที่ https://console.firebase.google.com)
- Google OAuth Credentials (สำหรับการเข้าสู่ระบบด้วย Google)
- Discord OAuth Credentials (สำหรับการเข้าสู่ระบบด้วย Discord)

## 🚀 การตั้งค่า

### 1. **เตรียม Firebase Project**

1. ไปที่ [Firebase Console](https://console.firebase.google.com)
2. สร้าง project ใหม่
3. ไปที่ **Authentication** → **Sign-in method**
4. เปิดใช้งาน:
   - Email/Password
   - Google
   - Discord (ที่ปุ่ม "Add new provider")

### 2. **เปิดใช้งาน Email Verification**

ใน Firebase Console:
1. ไปที่ **Authentication** → **Templates**
2. เลือก **Email verification** และตรวจสอบว่าอีเมลเท่มเพลต ถูกตั้งค่าแล้ว

### 3. **สร้าง Google OAuth Credentials**

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. ไปที่ **APIs & Services** → **Credentials**
3. สร้าง **OAuth 2.0 Client IDs** สำหรับ Web
4. เพิ่ม URL: `http://localhost:3000` (สำหรับ development)
5. คัดลอก Client ID

### 4. **สร้าง Discord OAuth Credentials**

1. ไปที่ [Discord Developer Portal](https://discord.com/developers/applications)
2. สร้างแอปพลิเคชันใหม่
3. ไปที่ **OAuth2** → **Scopes** เลือก `identify` และ `email`
4. เพิ่ม Redirect URI: `http://localhost:3000/` (สำหรับ development)
5. คัดลอก Client ID

### 5. **ติดตั้ง Dependencies**

```bash
npm install
```

### 6. **ตั้งค่า Firebase Configuration**

แก้ไขไฟล์ `src/config/firebase.js` และแทนที่ค่าเหล่านี้:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

คุณจะหาค่าเหล่านี้ได้ใน Firebase Console ที่เมนู **Project Settings**

### 7. **เริ่มต้น Development Server**

```bash
npm start
```

แอปพลิเคชันจะเปิด ที่ `http://localhost:3000`

### 8. **Deploy Socket Server (จำเป็นสำหรับ production)**

Socket server ของ Melody Mess ต้องรันบน host แยกจาก Firebase Hosting หรือ frontend เพราะต้องใช้ websocket/persistent connection.

#### Railway (แนะนำ)
1. สร้าง GitHub repo จากโปรเจกต์นี้
2. เปิด [Railway.app](https://railway.app) แล้วเชื่อม GitHub
3. สร้าง Project ใหม่ และเลือก repo นี้
4. ตั้งค่า Build command เป็น `npm install`
5. ตั้งค่า Start command เป็น `npm run start:socket`
6. Deploy แล้วจะได้ URL เช่น `https://your-socket-server.up.railway.app`

#### ตั้งค่า environment ของ frontend
- ใน Firebase Hosting / Vercel / production environment ให้ตั้งค่า:
  - `REACT_APP_SOCKET_URL=https://your-socket-server.up.railway.app`

#### ตัวอย่าง env file
- `.env.local` (สำหรับ local development)
  - `REACT_APP_SOCKET_URL=http://localhost:3003`
- `.env.example` (สำหรับตัวอย่าง)
  - `REACT_APP_SOCKET_URL=https://your-socket-server.up.railway.app`

#### หมายเหตุ
- อย่าใช้ `localhost:3003` ใน production เพราะ browser บนผู้ใช้จะพยายามเชื่อม localhost ของเครื่องผู้ใช้เอง
- `Firebase Hosting` ไม่สามารถเป็น websocket server ได้โดยตรง ดังนั้นต้อง deploy socket server แยกจาก frontend

## 📁 โครงสร้างไฟล์

```
src/
├── components/
│   └── PrivateRoute.js           # Route protection component
├── config/
│   ├── firebase.js               # Firebase configuration
│   └── AuthContext.js            # Auth state management
├── pages/
│   ├── Auth.css                  # Styling for auth pages
│   ├── Home.css                  # Styling for home page
│   ├── Home.js                   # Dashboard page
│   ├── Login.js                  # Login page
│   └── Register.js               # Register page
├── App.css                       # Global styles
├── App.js                        # Main app component
└── index.js                      # Entry point
```

## 🔑 วิธีการการใช้ Auth Functions

### ลงทะเบียน (Register)

```javascript
import { useAuth } from './config/AuthContext';

const { signup, signInWithGoogle, signInWithDiscord } = useAuth();

// Email registration
const user = await signup(email, password);
// จะส่งอีเมล verification โดยอัตโนมัติ
```

### เข้าสู่ระบบ (Login)

```javascript
const { login } = useAuth();

const user = await login(email, password);
// ต้องยืนยันอีเมลแล้ว
```

### Google Login

```javascript
const { signInWithGoogle } = useAuth();

const user = await signInWithGoogle();
```

### Discord Login

```javascript
const { signInWithDiscord } = useAuth();

const user = await signInWithDiscord();
```

### ออกจากระบบ (Logout)

```javascript
const { logout } = useAuth();

await logout();
```

### รีเซ็ตรหัสผ่าน (Reset Password)

```javascript
const { resetPassword } = useAuth();

await resetPassword(email);
// จะส่งอีเมล reset link
```

## 🔐 Security Best Practices

1. ✅ ไม่เก็บค่า Firebase config ในที่ที่มี user input
2. ✅ ใช้ HTTPS สำหรับ production
3. ✅ ตั้งค่า Firebase Security Rules เพิ่มเติม
4. ✅ ไม่แสดงข้อมูล user ที่ละเอียดอ่อนในคอนโซล
5. ✅ ตั้งค่า Redirect URLs ที่ถูกต้องสำหรับ OAuth providers

## 🐛 Troubleshooting

### ปัญหา: "Cannot find module 'firebase'"
**วิธีแก้:** รันคำสั่ง `npm install`

### ปัญหา: "authDomain is invalid"
**วิธีแก้:** ตรวจสอบว่า Firebase config ถูกต้องจาก Firebase Console

### ปัญหา: Google/Discord login ไม่ทำงาน
**วิธีแก้:** 
- ตรวจสอบว่า OAuth credentials ตั้งค่าถูกต้อง
- เพิ่ม localhost URLs ใน authorized redirect URIs
- ตรวจสอบว่าเปิดใช้งาน provider ใน Firebase Console

### ปัญหา: Email verification ไม่มาถึง
**วิธีแก้:**
- ตรวจสอบกล่องขยะ/spam
- ตรวจสอบว่า email template ตั้งค่าแล้ว
- รอ 5-10 นาทีเพราะอีเมลอาจล่าช้า

## 📚 เอกสารอ้างอิง

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [React Router Documentation](https://reactrouter.com/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Discord OAuth Setup](https://discord.com/developers/docs/topics/oauth2)

## 📝 License

MIT License - คุณสามารถใช้โปรเจคนี้อย่างอิสระได้

## 🤝 ผู้ช่วย

หากมีข้อเสนอแนะหรือ bug โปรดแจ้งให้เรา

---

**Happy Coding! 🚀**
