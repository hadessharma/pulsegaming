import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// Replace with your Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyA-R_ZIzcaYr_ZN4kQGuP2ETIQvDEIFtPM",
  authDomain: "pulsegaming-c800c.firebaseapp.com",
  projectId: "pulsegaming-c800c",
  storageBucket: "pulsegaming-c800c.firebasestorage.app",
  messagingSenderId: "504204411285",
  appId: "1:504204411285:web:50dc4560b2fed634eff69c",
  measurementId: "G-QN6F9163T5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
export const subscribeToAuthChanges = (callback) => onAuthStateChanged(auth, callback);
