import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBVKaHW8SGG_D4WkAvJsJZmYgH63Dc1YeI",
  authDomain: "truck-market-cd295.firebaseapp.com",
  projectId: "truck-market-cd295",
  storageBucket: "truck-market-cd295.firebasestorage.app",
  messagingSenderId: "817276261139",
  appId: "1:817276261139:web:3a5aad49184d0a035cc0e6",
  measurementId: "G-H1DN3H4DZ8"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Configure auth settings
const auth = getAuth(app);
auth.useDeviceLanguage(); // Use the device's language for emails
auth.settings.appVerificationDisabledForTesting = false; // Ensure verification is enabled

export { auth, analytics };
export const db = getFirestore(app);
export const storage = getStorage(app);