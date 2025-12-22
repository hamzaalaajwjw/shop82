import { auth, database } from "./firebase.js";
import { ref, push, set, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

window.createGroup = async function () {
  const name = prompt("اسم الكروب");
  if (!name) return;

  const g = push(ref(database, "groups"));
  await set(g, {
    name,
    owner: auth.currentUser.uid,
    members: { [auth.currentUser.uid]: "owner" }
  });
};

const gid = localStorage.getItem("groupId");
if (!gid) return;

const gRef = ref(database, "groups/" + gid + "/messages");

onChildAdded(gRef, s => {
  const d = document.createElement("div");
  d.className = "message";
  d.textContent = s.val().text;
  messages.appendChild(d);
});

window.send = function () {
  push(gRef, {
    from: auth.currentUser.uid,
    text: msg.value,
    time: Date.now()
  });
  msg.value = "";
};