const admin = require("firebase-admin");

console.log("admin keys:", Object.keys(admin));
console.log("admin.credential:", admin.credential);
console.log("admin.initializeApp:", typeof admin.initializeApp);
