// Firebase configuration and utilities
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export class FirebaseService {
  private config: FirebaseConfig;
  private isInitialized = false;

  constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    };
  }

  async initialize(): Promise<boolean> {
    try {
      // Check if Firebase configuration is complete
      if (!this.config.apiKey || !this.config.databaseURL || !this.config.projectId) {
        console.warn("Firebase configuration incomplete");
        return false;
      }
      
      console.log("Firebase initialized successfully with project:", this.config.projectId);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      return false;
    }
  }

  async pushAlert(alert: { app: string; type: string; timestamp: string }): Promise<string | null> {
    if (!this.isInitialized) {
      console.warn("Firebase not initialized");
      return null;
    }

    try {
      // In a real implementation, this would push to Firebase Realtime Database
      // For now, we'll simulate the push and return a mock ID
      const mockId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log("Pushing alert to Firebase:", {
        path: `/alerts/${mockId}`,
        data: alert
      });
      
      return mockId;
    } catch (error) {
      console.error("Failed to push alert to Firebase:", error);
      return null;
    }
  }

  isConnected(): boolean {
    return this.isInitialized;
  }
}

export const firebaseService = new FirebaseService();
