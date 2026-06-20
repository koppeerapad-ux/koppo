const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadServiceAccount() {
  const serviceAccountPath = path.join(process.cwd(), '.firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    } catch (err) {
      console.error('Failed to parse .firebase-service-account.json:', err.message);
    }
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      try {
        return JSON.parse(trimmed);
      } catch (err) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
      }
    }
  }

  return null;
}

function getAdminApp() {
  if (Array.isArray(admin.apps) && admin.apps.length > 0) {
    return admin.getApp();
  }

  const serviceAccount = loadServiceAccount();
  if (serviceAccount && serviceAccount.private_key) {
    if (typeof admin.cert !== 'function') {
      throw new Error('firebase-admin missing cert export');
    }
    try {
      return admin.initializeApp({
        credential: admin.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
      });
    } catch (err) {
      // If another initializer already created the default app with different options,
      // reuse the existing app instead of failing.
      if (err && (err.code === 'app/invalid-app-options' || /already exists/.test(err.message || ''))) {
        console.warn('Firebase app already exists; reusing default app');
        return admin.getApp();
      }
      throw err;
    }
  }

  // fallback to default credentials
  try {
    return admin.initializeApp();
  } catch (err) {
    if (err && /already exists/.test(err.message || '')) {
      return admin.getApp();
    }
    throw err;
  }
}

module.exports = { getAdminApp, admin };
