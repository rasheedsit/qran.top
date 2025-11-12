// This tells TypeScript that a global 'firebase' object exists.
// It is loaded via the <script> tags in index.html.
declare const firebase: any;

const firebaseConfig = {
  apiKey: "AIzaSyAHvjxsNjvUhWWadaDJ5SppYCtsB7pRGow",
  authDomain: "qrantop.firebaseapp.com",
  projectId: "qrantop",
  storageBucket: "qrantop.firebasestorage.app",
  messagingSenderId: "591123741849",
  appId: "1:591123741849:web:75b8b3ce13627f88dc4c08",
  measurementId: "G-ZD0G2C5MDV"
};

// Initialize Firebase only if it hasn't been initialized yet to avoid errors.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export the firestore instance and FieldValue for use in other components.
// We are using the v8 namespaced API.
const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
const FieldValue = firebase.firestore.FieldValue;

export { db, FieldValue, auth, googleProvider };