import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  remove,
  get  // ✅ ADD THIS
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC1D4HYiBVUgwwvVTm64mPWMj6WOthVhlw",
  authDomain: "e-commerce-6e5a1.firebaseapp.com",
  databaseURL: "https://e-commerce-6e5a1-default-rtdb.firebaseio.com",
  projectId: "e-commerce-6e5a1",
  storageBucket: "e-commerce-6e5a1.appspot.com",
  messagingSenderId: "964043622033",
  appId: "1:964043622033:web:c9e5ec4cbedc2936ad6130",
  measurementId: "G-L6JR3T4RJ5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ Export everything including get
export { db, ref, set, push, onValue, remove, get };
