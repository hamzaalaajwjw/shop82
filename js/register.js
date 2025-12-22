import { auth, database } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

window.register = async function () {
  const u = username.value.trim();
  const e = email.value;
  const p = password.value;

  if (!u || !e || !p) return alert("املأ كل الحقول");

  const usernameRef = ref(database, "usernames/" + u);
  const snap = await get(usernameRef);
  if (snap.exists()) return alert("اسم المستخدم محجوز");

  const cred = await createUserWithEmailAndPassword(auth, e, p);
  const uid = cred.user.uid;

  await set(ref(database, "users/" + uid), {
    username: u,
    email: e,
    status: "online",
    lastSeen: Date.now()
  });

  await set(usernameRef, uid);

  location.href = "index.html";
};