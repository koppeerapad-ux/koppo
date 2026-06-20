### 📋 Vercel Environment Variables Setup

**ไปที่:**
1. [Vercel Dashboard](https://vercel.com) 
2. เลือก Project: `web-ie-ie`
3. **Settings** → **Environment Variables**

**เพิ่มตัวแปรต่อไปนี้:**

#### **1. Discord OAuth**
```
DISCORD_CLIENT_ID = 1517506366330372147
DISCORD_CLIENT_SECRET = fvy-qatFOLqCUfLlMw2WMdHdg06UJdkg
```

#### **2. Firebase Service Account**
```
FIREBASE_SERVICE_ACCOUNT_JSON = <JSON string from .firebase-service-account.json>
```

**วิธีแปลง .firebase-service-account.json เป็น 1 line string:**

**Windows PowerShell:**
```powershell
$content = Get-Content ".firebase-service-account.json" -Raw
$content -replace '\n', '' -replace '\s+', ' ' | Set-Clipboard
```

**Mac/Linux:**
```bash
cat .firebase-service-account.json | tr '\n' ' ' | pbcopy
```

วาง output ลงใน Environment Variable

#### **3. Application URLs**
```
NEXT_PUBLIC_APP_URL = https://web-ie-ie.vercel.app
NEXT_PUBLIC_API_BASE_URL = https://web-ie-ie.vercel.app
```

---

### ✅ Verification Checklist

- [ ] `DISCORD_CLIENT_ID` ตั้งค่า
- [ ] `DISCORD_CLIENT_SECRET` ตั้งค่า
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` ตั้งค่า
- [ ] `NEXT_PUBLIC_APP_URL` ตั้งค่า
- [ ] Discord Developer Portal เพิ่ม Redirect URI: `https://web-ie-ie.vercel.app/api/auth/discord/callback`

---

### 🚀 Deploy

```bash
git add .
git commit -m "Setup Discord OAuth and Firebase"
git push origin main
```

Vercel จะ deploy อัตโนมัติ

---

### 🧪 Test

1. ไปที่ https://web-ie-ie.vercel.app/login
2. คลิกปุ่ม **Discord**
3. สำเร็จ!
