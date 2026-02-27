import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBaD8vhu9TUmQ7rq76OdL9hVDWmolbt5OQ",
  authDomain: "smart-fisheries-monitor-929e1.firebaseapp.com",
  databaseURL: "https://smart-fisheries-monitor-929e1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-fisheries-monitor-929e1",
  storageBucket: "smart-fisheries-monitor-929e1.firebasestorage.app",
  messagingSenderId: "973496001886",
  appId: "1:973496001886:web:9e3b8ef40de46e2e259bcf"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
export default app;
