import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

class FirebaseAdmin {
  private static instance: FirebaseAdmin
  private app: App

  private constructor() {
    const firebaseAdminConfig = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }

    if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
      throw new Error('Missing Firebase Admin configuration')
    }

    this.app = getApps().length === 0
      ? initializeApp({
          credential: cert(firebaseAdminConfig),
        })
      : getApps()[0]
  }

  static getInstance(): FirebaseAdmin {
    if (!FirebaseAdmin.instance) {
      FirebaseAdmin.instance = new FirebaseAdmin()
    }
    return FirebaseAdmin.instance
  }

  getApp(): App {
    return this.app
  }
}

const firebaseAdmin = FirebaseAdmin.getInstance()
export const adminAuth = getAuth(firebaseAdmin.getApp()) 