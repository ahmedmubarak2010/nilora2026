(()=>{
 const $=id=>document.getElementById(id),f=$("authForm");if(!f)return;
 const msg=$("authMessage"),btn=$("submitBtn"),show=(t,k="info")=>{msg.textContent=t;msg.className="message show "+k};
 async function go(user){
  if(!user){show("Sign-in could not be completed. Please try again.","error");return}
  location.href="overview.html";
 }
 $("googleBtn").onclick=async()=>{
  $("googleBtn").disabled=true;show("Redirecting to Google…");
  const {error}=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/auth-callback.html",queryParams:{prompt:"select_account"}}});
  if(error){show(error.message,"error");$("googleBtn").disabled=false}
 };
 $("emailAccessBtn").onclick=()=>{f.classList.remove("hidden");$("emailAccessBtn").classList.add("hidden");$("email").focus()};
 f.addEventListener("submit",async e=>{
  e.preventDefault();btn.disabled=true;
  try{
   let r;
   if(f.dataset.mode==="signup"){
    r=await db.auth.signUp({email:$("email").value.trim(),password:$("password").value,options:{data:{full_name:$("fullName").value.trim()}}});
    if(r.error)throw r.error;
    if(r.data.session)await go(r.data.user);else show("Account created. Confirm your email, then sign in.","success");
   }else{
    r=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
    if(r.error)throw r.error;await go(r.data.user);
   }
  }catch(e){show(e.message,"error")}
  finally{btn.disabled=false;btn.innerHTML=f.dataset.mode==="signup"?'Create account <iconify-icon icon="solar:user-plus-linear"></iconify-icon>':'Sign in <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>'}
 });
 $("modeToggle").onclick=()=>{
  const signup=f.dataset.mode!=="signup";f.dataset.mode=signup?"signup":"login";
  $("fullNameWrap").classList.toggle("hidden",!signup);$("fullName").required=signup;
  $("authTitle")&&($("authTitle").textContent=signup?"Create your account":"Welcome back");
  btn.innerHTML=signup?'Create account <iconify-icon icon="solar:user-plus-linear"></iconify-icon>':'Sign in <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>';
  $("modeToggle").textContent=signup?"Already registered? Sign in":"Create account";show("");
 };
 $("forgotBtn").onclick=async()=>{
  const email=$("email").value.trim();if(!email){show("Enter your email address first.");return}
  const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/reset-password.html"});
  show(error?"Could not send reset email.":"If the email is registered, a reset link has been sent.",error?"error":"success");
 };
})();