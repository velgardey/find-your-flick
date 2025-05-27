import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
    throw new Error('Firebase Admin environment variables are missing');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    // Only log in development mode and not during hot reloading
    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_MANUAL_SIG_HANDLE) {
      console.log('Firebase Admin initialized successfully');
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    throw error;
  }
}

export const adminAuth = admin.auth(); 