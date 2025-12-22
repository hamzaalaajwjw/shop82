import { auth, database } from "./firebase.js";
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const uid = auth.currentUser.uid;
const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const profilePicInput = document.getElementById("profilePic");

// تحميل البيانات الحالية عند فتح الصفحة
get(ref(database, "users/" + uid)).then(snap => {
  if (snap.exists()) {
    const data = snap.val();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
  }
});

window.updateProfile = async function () {
  const newUsername = usernameInput.value.trim();
  const newBio = bioInput.value.trim();

  if (!newUsername) return alert("اسم المستخدم لا يمكن أن يكون فارغ");

  // تحديث اسم المستخدم والنبذة
  await update(ref(database, "users/" + uid), {
    username: newUsername,
    bio: newBio
  });

  // إذا تم رفع صورة
  if (profilePicInput.files.length > 0) {
    const file = profilePicInput.files[0];
    const storageRef = firebase.storage().ref("profilePics/" + uid);
    await storageRef.put(file);
    const photoURL = await storageRef.getDownloadURL();
    await update(ref(database, "users/" + uid), { profilePic: photoURL });
  }

  alert("تم تحديث البروفايل بنجاح!");
};