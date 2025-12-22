import { auth, database } from "./firebase.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const list = document.getElementById("chatList");

onValue(ref(database, "users"), snap => {
  list.innerHTML = "";
  snap.forEach(s => {
    if (s.key === auth.currentUser.uid) return;
    const d = document.createElement("div");
    d.textContent = s.val().username;
    d.onclick = () => {
      localStorage.setItem("chatUser", s.key);
      localStorage.removeItem("groupId");
      location.reload();
    };
    list.appendChild(d);
  });
});