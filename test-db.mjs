import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCdBxc3OKPYTecW8KyITHsjeE58OjYoMoc",
  authDomain: "match-roomm.firebaseapp.com",
  projectId: "match-roomm",
  storageBucket: "match-roomm.firebasestorage.app",
  messagingSenderId: "451768580027",
  appId: "1:451768580027:web:9fc492bf59c4424719f69e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testConnection() {
  try {
    const q = query(collection(db, 'users'), limit(1));
    await getDocs(q);
    console.log("SUCCESS: Database is successfully connected and responding!");
    process.exit(0);
  } catch (error) {
    console.error("ERROR: Database connection failed. Reason:");
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();
