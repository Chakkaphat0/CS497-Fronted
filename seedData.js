import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEToiFyljeVblo9eP7cwgriWRLFCo3uyM",
  authDomain: "cs497-e3b0e.firebaseapp.com",
  projectId: "cs497-e3b0e",
  storageBucket: "cs497-e3b0e.firebasestorage.app",
  messagingSenderId: "999506203412",
  appId: "1:999506203412:web:ae70e294ac81bb8bc02801"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const usersToCreate = [
  {
    email: "enterprise@test.com",
    password: "password123",
    role: "enterprise",
    displayName: "Enterprise Admin",
    companyName: "TechCorp Inc."
  },
  {
    email: "university@test.com",
    password: "password123",
    role: "university",
    displayName: "University Admin",
    universityName: "Chulalongkorn University"
  },
  {
    email: "candidate@test.com",
    password: "password123",
    role: "candidate",
    displayName: "Alice Candidate"
  }
];

async function seed() {
  for (const u of usersToCreate) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, u.email, u.password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: u.displayName });
      
      const roleData = {
        role: u.role,
        createdAt: new Date().toISOString()
      };
      
      if (u.role === 'enterprise') roleData.companyName = u.companyName;
      if (u.role === 'university') roleData.universityName = u.universityName;
      
      await setDoc(doc(db, "userRoles", user.uid), roleData);
      console.log(`✅ Created ${u.role} user: ${u.email}`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️ User ${u.email} already exists.`);
      } else {
        console.error(`❌ Error creating ${u.email}:`, error);
      }
    }
  }
  process.exit(0);
}

seed();
