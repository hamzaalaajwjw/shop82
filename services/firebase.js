import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "../config/keys.js";

const app = getApps().length === 0 ? // initialized via services/firebase.js
export const db = getDatabase(app);
export const storage = getStorage(app);

export default app;
