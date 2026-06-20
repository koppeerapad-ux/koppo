const admin = require("firebase-admin");

console.log("\nTest: Try importing firebase-admin/firestore:");
try {
  const { getFirestore } = require("firebase-admin/firestore");
  console.log("✓ getFirestore available:", typeof getFirestore);
} catch (e) {
  console.error("✗ Error:", e.message);
}

console.log("\nTest2: Try direct require:");
try {
  const firestoreModule = require("firebase-admin/firestore");
  console.log("✓ Module exported:", Object.keys(firestoreModule));
} catch (e) {
  console.error("✗ Error:", e.message);
}

console.log("\nTest3: Check firebase-admin structure:");
try {
  const fs = require("fs");
  const serviceAccount = JSON.parse(
    fs.readFileSync(".firebase-service-account.json", "utf-8")
  );

  const app = admin.initializeApp({
    credential: admin.cert(serviceAccount),
    projectId: "testweb67-9c814",
  });
  
  // Try to access methods on app after initialization
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(app));
  console.log("✓ App methods:", methods.filter(m => m.includes("fire") || m.includes("store")));
} catch (e) {
  console.error("✗ Error:", e.message);
}
