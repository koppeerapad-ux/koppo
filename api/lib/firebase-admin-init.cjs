const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initializeFirebase() {
  // Check if already initialized
  if (admin.apps && admin.apps.length > 0) {
    console.log('Firebase already initialized');
    return admin.getApp();
  }

  try {
    // Priority 1: Try local file first (most reliable)
    const serviceAccountPath = path.join(process.cwd(), '.firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      console.log('Loading Firebase from local file:', serviceAccountPath);
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    } 
    // Priority 2: Try environment variable
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      console.log('Loading Firebase from environment variable (length:', jsonStr.length, ')');
      serviceAccount = JSON.parse(jsonStr);
    }
  } catch (err) {
    console.error('Failed to load service account:', err.message);
    console.error('Raw env var length:', process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.length);
    throw new Error(`Firebase credentials parsing failed: ${err.message}`);
  }

  if (!serviceAccount) {
    throw new Error('Firebase credentials not found');
  }

  if (!serviceAccount.private_key) {
    console.error('serviceAccount keys:', Object.keys(serviceAccount));
    throw new Error('Firebase credentials missing private_key');
  }

  console.log('admin.cert available:', typeof admin.cert === 'function');

  if (typeof admin.cert !== 'function') {
    console.error('firebase-admin module missing cert export');
    console.error('admin keys:', Object.keys(admin));
    throw new Error('Firebase Admin SDK not fully initialized - cert not available');
  }

  try {
    return admin.initializeApp({
      credential: admin.cert(serviceAccount),
      projectId: 'testweb67-9c814',
    });
  } catch (initErr) {
      if (initErr && /already exists/.test(initErr.message || '')) {
        console.warn('Firebase app already initialized, reusing existing app');
        return admin.getApp();
      }
    throw initErr;
  }
}

module.exports = initializeFirebase;
