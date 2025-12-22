import { auth, database } from "./firebase.js";
import { ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

function chatId(a, b) {
  return [a, b].sort().join("_");
}

const other = localStorage.getItem("chatUser");
if (!other) return;

const id = chatId(auth.currentUser.uid, other);
const chatRef = ref(database, "privateChats/" + id);

onChildAdded(chatRef, s => {
  const d = document.createElement("div");
  d.className = "message";
  d.textContent = s.val().text;
  messages.appendChild(d);
});

window.send = function () {
  if (!msg.value) return;
  push(chatRef, {
    from: auth.currentUser.uid,
    text: msg.value,
    time: Date.now()
  });
  msg.value = "";
};