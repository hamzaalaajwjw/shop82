import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

window.login = async function () {
  await signInWithEmailAndPassword(auth, email.value, password.value);
  location.href = "index.html";
};