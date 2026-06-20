# 📖 Firebase Authentication - ขั้นตอนการตั้งค่า (Thai)

> คำแนะนำโดยละเอียดสำหรับการตั้งค่า Firebase Authentication เต็ม ๆ

## ⏱️ ระยะเวลา: ประมาณ 30 นาที

---

## ✅ ขั้นตอนที่ 1: ติดตั้ง Node.js

1. ไปที่ https://nodejs.org/
2. ดาวน์โหลด LTS version (แนะนำ v18 ขึ้นไป)
3. ติดตั้งและทำการ setup เสร็จสิ้น
4. ตรวจสอบโดยเปิด Terminal/CMD และพิมพ์:
   ```bash
   node --version
   npm --version
   ```

---

## ✅ ขั้นตอนที่ 2: สร้าง Firebase Project

1. **ไปที่ Firebase Console:**
   - เปิด https://console.firebase.google.com/
   - ล็อกอินด้วย Google Account

2. **สร้าง Project ใหม่:**
   - คลิก "Create a project"
   - ตั้งชื่อ: `firebase-auth-app` (หรือชื่ออื่นที่คุณต้องการ)
   - เลือก "Realtime Database location" (แนะนำ Asia Southeast 1 สำหรับประเทศไทย)
   - คลิก "Create project"
   - รอให้ project ถูกสร้าง (ประมาณ 2-3 นาที)

3. **ไปที่ Project Settings:**
   - คลิกไอคอนเฟืองที่มุมบนซ้าย → "Project settings"
   - คัดลอกค่าต่อไปนี้ (จะใช้หลังๆ):
     - `apiKey`
     - `authDomain`
     - `projectId`
     - `storageBucket`
     - `messagingSenderId`
     - `appId`

---

## ✅ ขั้นตอนที่ 3: เปิดใช้งาน Authentication Methods

### 3.1 Email/Password Authentication:
1. ไปที่ **Authentication** → **Sign-in method** (ด้านซ้าย)
2. หาแถว "Email/Password" และคลิก "Enable"
3. เลือก "Email/password" → คลิก "Enable" → "Save"

### 3.2 Google OAuth:
1. คลิก **Add new provider**
2. เลือก **Google**
3. คลิก **Enable**
4. ตั้งชื่อ support email (ใช้อันเดิม)
5. คลิก **Save**

### 3.3 Discord OAuth:
1. คลิก **Add new provider**
2. เลือก **Discord** (อาจต้องเลื่อนลง)
3. คลิก **Enable**
4. ตอนนี้ยังคงเฉพาะ Enable ก่อน (จะตั้งค่า App ID ทีหลัง)
5. คลิก **Save**

---

## ✅ ขั้นตอนที่ 4: ตั้งค่า Google OAuth

1. **ไปที่ Google Cloud Console:**
   - เปิด https://console.cloud.google.com/

2. **ตรวจสอบ Project:**
   - ที่ด้านบนสุด จะเห็น dropdown project
   - เลือก project ที่ Firebase สร้างให้ (ชื่อเดียวกับ Firebase project)

3. **เปิดใช้งาน Google+ API:**
   - ไปที่ **APIs & Services** → **Library**
   - ค้นหา "Google+ API"
   - คลิก → **Enable**

4. **สร้าง OAuth 2.0 Client ID:**
   - ไปที่ **APIs & Services** → **Credentials**
   - คลิก **Create Credentials** → **OAuth client ID**
   - เลือก **Web application**
   - ตั้งชื่อ: `Firebase Web Client`
   - ที่ "Authorized JavaScript origins" คลิก **Add URI**
     ```
     http://localhost:3000
     ```
   - ที่ "Authorized redirect URIs" คลิก **Add URI**
     ```
     http://localhost:3000/
     ```
   - คลิก **Create**
   - **คัดลอก Client ID** (จะใช้ทีหลัง แต่ Firebase สามารถดึงได้เอง)
   - คลิก **OK**

---

## ✅ ขั้นตอนที่ 5: ตั้งค่า Discord OAuth

1. **ไปที่ Discord Developer Portal:**
   - เปิด https://discord.com/developers/applications

2. **สร้าง Application ใหม่:**
   - คลิก **New Application**
   - ตั้งชื่อ: `Firebase Auth App`
   - คลิก **Create**

3. **ตั้งค่า OAuth2:**
   - ไปที่ **OAuth2** → **General**
   - **คัดลอก Client ID** (หมายเลข)
   - ไปที่ **OAuth2** → **URL Generator**
   - ใต้ "Scopes" เลือก:
     - ✓ `identify`
     - ✓ `email`
   - คัดลอก URL ที่สร้าง

4. **ตั้ง Redirect URI:**
   - ไปกลับ **OAuth2** → **General**
   - ที่ "Redirects" คลิก **Add Another**
   - พิมพ์:
     ```
     http://localhost:3000
     ```
   - คลิก **Save Changes**

---

## ✅ ขั้นตอนที่ 6: ติดตั้ง Project นี้

1. **เปิด Terminal/CMD:**
   - ใน VS Code: View → Terminal

2. **ไปที่ project folder:**
   ```bash
   cd "c:\Users\user\Desktop\web ie ie"
   ```

3. **ติดตั้ง dependencies:**
   ```bash
   npm install
   ```
   - รอให้เสร็จ (ประมาณ 2-5 นาที)

---

## ✅ ขั้นตอนที่ 7: ตั้งค่า Firebase Configuration

1. **เปิดไฟล์ `src/config/firebase.js`**

2. **แทนที่ค่าต่อไปนี้:**
   ```javascript
   const firebaseConfig = {
     apiKey: "คัดลอกจาก Firebase Console",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "ตัวเลข",
     appId: "1:123456789:web:abcd1234"
   };
   ```

---

## ✅ ขั้นตอนที่ 8: เริ่มต้น Development Server

1. **ในเทอมินัล พิมพ์:**
   ```bash
   npm start
   ```

2. **บราวเซอร์จะเปิดโดยอัตโนมัติ:**
   - ถ้าไม่ ไปที่ `http://localhost:3000`

3. **ทดสอบ:**
   - คลิก "ลงทะเบียน"
   - กรอกอีเมลและรหัสผ่าน
   - หลังจาก signup สำเร็จจะเห็นข้อความ "กรุณาตรวจสอบอีเมล"

---

## ✅ ขั้นตอนที่ 9: ยืนยันอีเมล

1. **เปิดกล่องจดหมายของคุณ:**
   - หาอีเมลจาก Firebase
   - ตรวจสอบ spam/junk folder ด้วย

2. **คลิกลิงก์ยืนยัน**

3. **กลับไปที่แอป:**
   - เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
   - ตอนนี้ควรเข้าสู่ได้แล้ว

---

## ✅ ขั้นตอนที่ 10: ทดสอบทั้งหมด

- [ ] **Email/Password Register** ✓
- [ ] **Email Verification** ✓
- [ ] **Email/Password Login** ✓
- [ ] **Password Reset** ✓
- [ ] **Google Login** ✓
- [ ] **Discord Login** ✓
- [ ] **View User Info** ✓
- [ ] **Logout** ✓

---

## 🔧 Troubleshooting

### ❌ "Cannot find module 'react-router-dom'"
```bash
npm install react-router-dom
```

### ❌ Firebase Config ไม่ทำงาน
- ไป Firebase Console → Project Settings
- คัดลอกค่าใหม่อีกครั้ง
- ตรวจสอบว่าไม่มีการพิมพ์ผิด

### ❌ Google/Discord login ไม่ทำงาน
- ตรวจสอบ OAuth URIs ว่า include `http://localhost:3000`
- ในส่วน Discord: ตรวจสอบ Scopes ว่าเลือก `identify` และ `email`

### ❌ Email verification ไม่ได้รับ
- ตรวจสอบ spam folder
- ไปที่ Firebase → Authentication → Templates → ตรวจสอบ Email verification template

---

## 📞 ต้องการความช่วยเหลืออีก?

1. ตรวจสอบ README.md
2. ดูที่ [Firebase Docs](https://firebase.google.com/docs)
3. ตรวจสอบ Browser Console สำหรับ error messages (F12)

---

**ทำสำเร็จแล้ว! 🎉 อ่านต่อเรื่อง Security Best Practices ใน README.md**
