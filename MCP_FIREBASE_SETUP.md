# MCP Firebase Setup Guide

## ✅ สิ่งที่เตรียมไว้แล้ว

1. **mcp-firebase-server.ts** - MCP Server implementation สำหรับ Firebase Firestore
2. **.mcpservers.json** - MCP configuration file
3. **.firebase-service-account.json** - Template สำหรับ Firebase credentials

## 📋 ขั้นตอนที่เหลือ

### 1. ได้รับ Firebase Service Account Key

ทำตามขั้นตอนนี้เพื่อรับ Service Account Key จาก Firebase:

1. ไปที่ [Firebase Console](https://console.firebase.google.com)
2. เลือก Project: **testweb67-9c814**
3. ไปที่ **Project Settings** (⚙️ icon)
4. ไปที่ **Service Accounts** tab
5. คลิก **Generate New Private Key**
6. จะดาวน์โหลด JSON file

### 2. ใส่ Service Account Key

1. เปิด `.firebase-service-account.json` ไฟล์
2. คัดลอกเนื้อหาจาก JSON file ที่ดาวน์โหลดมาแทนที่ placeholder

### 3. ตรวจสอบ .gitignore

ให้แน่ใจว่า `.firebase-service-account.json` ไม่ได้ถูก commit ลง git:

```
# ใน .gitignore
.firebase-service-account.json
.env.local
```

## 🚀 ทดสอบ MCP Firebase Server

### ตรวจสอบว่า Server สามารถเริ่มได้:

```bash
npx tsx mcp-firebase-server.ts
```

มันควรจะพิมพ์: `Firebase MCP server started`

## 🛠️ Available MCP Tools

MCP Firebase Server นี้รองรับเครื่องมือต่อไปนี้:

### 1. **get_document**
   - ดึงเอกสารจาก Firestore
   - Parameters: `collection`, `document`

### 2. **set_document**
   - สร้าง/เซตเอกสาร
   - Parameters: `collection`, `document`, `data`, `merge` (optional)

### 3. **update_document**
   - อัปเดตฟิลด์เอกสาร
   - Parameters: `collection`, `document`, `data`

### 4. **delete_document**
   - ลบเอกสาร
   - Parameters: `collection`, `document`

### 5. **query_collection**
   - ค้นหาเอกสารในคอลเลกชัน
   - Parameters: `collection`, `where` (optional), `limit` (optional), `orderBy` (optional)

### 6. **list_collections**
   - แสดงรายชื่อคอลเลกชันทั้งหมด

### 7. **batch_write**
   - ทำการเขียนหลายอย่างพร้อมกัน
   - Parameters: `operations` array

## 📝 Example Usage

### ตัวอย่าง: Query Users Collection

```json
{
  "collection": "users",
  "where": [
    {
      "field": "role",
      "operator": "==",
      "value": "admin"
    }
  ],
  "limit": 10
}
```

### ตัวอย่าง: Set Document

```json
{
  "collection": "users",
  "document": "user123",
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-01"
  }
}
```

## 🔗 Environment Variables

ตรวจสอบใน `.mcpservers.json`:

```json
{
  "firebase": {
    "command": "node",
    "args": ["--loader", "tsx", "./mcp-firebase-server.ts"],
    "env": {
      "FIREBASE_PROJECT_ID": "testweb67-9c814",
      "FIREBASE_DATABASE_URL": "https://testweb67-9c814.firebaseio.com",
      "GOOGLE_APPLICATION_CREDENTIALS": ".firebase-service-account.json"
    }
  }
}
```

## ✨ ติดตั้งเสร็จสิ้น!

หลังจากเพิ่ม Service Account Key ให้กับ `.firebase-service-account.json` แล้ว:

1. MCP Server พร้อมใช้งาน
2. สามารถใช้ Copilot ในการจัดการ Firebase ได้
3. ใช้เครื่องมือเหล่านี้ในการโต้ตอบ Firestore

---

**หมายเหตุ:** Service Account Key มีสิทธิ์ในการเข้าถึงทุกอย่างใน Firebase project ของคุณ ควรเก็บไว้อย่างปลอดภัย!
