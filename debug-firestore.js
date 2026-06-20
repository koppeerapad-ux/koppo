const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = JSON.parse(
  fs.readFileSync(".firebase-service-account.json", "utf-8")
);

console.log("=== Firebase Admin v14 API ===");
console.log("admin.getApps():", admin.getApps());

const app = admin.initializeApp({
  credential: admin.cert(serviceAccount),
  projectId: "testweb67-9c814",
});

console.log("\n=== After InitializeApp ===");
console.log("admin keys:", Object.keys(admin).sort());
console.log("app keys:", Object.keys(app).sort());
console.log("typeof admin.firestore:", typeof admin.firestore);
console.log("typeof app.firestore:", typeof app.firestore);

// Try accessing firestore
try {
  // Try different approaches
  if (typeof app.firestore === "function") {
    console.log("✓ app.firestore is a function");
    const db = app.firestore();
    console.log("✓ Got firestore instance:", typeof db);
  } else if (typeof admin.firestore === "function") {
    console.log("✓ admin.firestore is a function");
    const db = admin.firestore(app);
    console.log("✓ Got firestore instance:", typeof db);
  } else {
    console.log("✗ No firestore method found");
    
    // Check if there's a firestore property
    if (app.firestore) {
      console.log("app.firestore exists:", app.firestore);
    }
  }
} catch (err) {
  console.error("Error accessing firestore:", err.message);
}
