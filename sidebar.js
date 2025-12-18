function toggleSidebar(){
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
}

function go(page){ location.href=page; }

function protectedPublish(){
  if(firebase.auth().currentUser){
    location.href="publish.html";
  }else{
    location.href="auth.html";
  }
}

firebase.auth().onAuthStateChanged(u=>{
  if(userInfo){
    userInfo.innerText = u ? "مسجل: "+u.email : "غير مسجل";
  }
});
