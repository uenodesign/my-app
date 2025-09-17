// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC35FHA0_tlN0yJE9sykjPfmJppq6unJ9s",
  authDomain: "authentication-a01ac.firebaseapp.com",
  projectId: "authentication-a01ac",
  storageBucket: "authentication-a01ac.firebasestorage.app",
  messagingSenderId: "956090853895",
  appId: "1:956090853895:web:f3f449ff6625ca315fd8a2",
  measurementId: "G-971Q8HFK5L",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
