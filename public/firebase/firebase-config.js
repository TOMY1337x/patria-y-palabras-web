import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-N4qZYlOnifxVowjYFd1ygk09J6xbrWM",
  authDomain: "pagina-web--pyp.firebaseapp.com",
  projectId: "pagina-web--pyp",
  storageBucket: "pagina-web--pyp.appspot.com",
  messagingSenderId: "799732645620",
  appId: "1:799732645620:web:3e2a5a8b9f1e1e1b5a5b5f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth, collection, query, where, orderBy, limit, getDocs };

window.firebaseData = {
  db,
  firestore: { collection, query, where, orderBy, limit, getDocs },
  auth
};
