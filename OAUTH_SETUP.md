# 🔧 OAuth Setup Guide - Discord & Google

## ⚙️ Environment Variables ที่ต้องตั้ง

### **1. Local Development (.env.local)**

```env
# Discord OAuth
REACT_APP_DISCORD_CLIENT_ID=1517506366330372147
REACT_APP_API_BASE_URL=http://localhost:3000

# Firebase
REACT_APP_FIREBASE_API_KEY=AIzaSyB1qA9l7ZTlkDpMApiOauMDPLh6yC3P070
REACT_APP_FIREBASE_AUTH_DOMAIN=testweb67-9c814.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=testweb67-9c814
REACT_APP_FIREBASE_STORAGE_BUCKET=testweb67-9c814.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=596233645386
REACT_APP_FIREBASE_APP_ID=1:596233645386:web:04b825f8729d959b7b25b3
```

### **2. Vercel Environment Variables**

ไปที่ **Vercel Dashboard** → Project Settings → **Environment Variables**

เพิ่มตัวแปรต่อไปนี้:

```
DISCORD_CLIENT_ID=1517506366330372147
DISCORD_CLIENT_SECRET=fvy-qatFOLqCUfLlMw2WMdHdg06UJdkg
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"testweb67-9c814",...}
NEXT_PUBLIC_APP_URL=https://web-ie-ie.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://web-ie-ie.vercel.app
```

---

## 📋 Discord Setup

### **1. หา Client Secret**
1. ไปที่ [Discord Developer Portal](https://discord.com/developers/applications)
2. เลือก Application: **your-app**
3. ไปที่ **OAuth2** → **General**
4. Copy **Client Secret**: `fvy-qatFOLqCUfLlMw2WMdHdg06UJdkg`

### **2. ตั้งค่า Redirects**
1. ไปที่ **OAuth2** → **Redirects**
2. เพิ่มสำหรับ development:
   - `http://localhost:3000/api/auth/discord/callback`
3. เพิ่มสำหรับ production:
   - `https://web-ie-ie.vercel.app/api/auth/discord/callback`

### **3. Check Scopes**
ต้องมี:
- ✅ `identify`
- ✅ `email`

---

## 🔐 Firebase Service Account Setup

### **วิธีแปลง Service Account เป็น Environment Variable:**

```bash
# Windows PowerShell
$cred = Get-Content ".firebase-service-account.json" -Raw
$cred
```

Copy output แล้ววาง ใน Vercel Environment Variable: `FIREBASE_SERVICE_ACCOUNT_JSON`

---

## 🧪 ทดสอบ

### **Local Development:**
```bash
npm start
```

ไปที่ http://localhost:3000/login และลองกด Discord button

### **Production:**
Push ไปที่ main branch - Vercel จะ deploy อัตโนมัติ

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| `DISCORD_CLIENT_ID undefined` | เพิ่มไปที่ Environment Variables ใน Vercel |
| `FIREBASE_SERVICE_ACCOUNT_JSON missing` | ต้องเป็น 1 line JSON string ไม่ใช่ multiline |
| `Redirect URI mismatch` | ตรวจสอบให้ตรงกับ Discord Developer Portal |
| `Failed to fetch Discord user` | เปิด email scope ใน Discord Developer Portal |

---

## 🔗 Firebase Authentication

### **Google Sign-In (ผ่าน Firebase)**

Firebase ได้ enable Google sign-in ไว้แล้ว

ใน frontend ใช้:
```javascript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
```

---

**Status:**
- ✅ Discord OAuth: Ready
- ✅ Firebase Admin: Ready
- ✅ Custom Token Flow: Ready
- ⏳ Waiting: Vercel Environment Variables setup
