window.NILORA=window.NILORA||{};
NILORA.mount=({title,active,role})=>{
 const p=NILORA.profile||{},user=NILORA.user||{},meta=user.user_metadata||{};
 const name=p.full_name||user.email||"NILORA user";
 const avatar=meta.avatar_url||meta.picture||user.identities?.[0]?.identity_data?.avatar_url||p.avatar_url||(name==="Ahmed Mubarak"?"Assets/Ahmed Mubarak.jpg":"");
 const photo=typeof avatar==="string"&&(/^(https:\/\/|Assets\/)/i.test(avatar))?avatar:"";
 const initials=(String(name).split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join("")||"N").replace(/[^A-Z0-9]/g,"");
 const avatarHtml=photo?'<img class="account-avatar" src="'+photo.replace(/"/g,"&quot;")+'" alt="" referrerpolicy="no-referrer">':'<span class="account-avatar account-initials" aria-label="Account initials">'+initials+'</span>';
 const safeName=String(name).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const farmer=[["farmer-dashboard.html","Overview","solar:widget-2-linear"],["farmer-farms.html","My farms","solar:buildings-2-linear"],["farmer-fields.html","Fields","solar:map-point-wave-linear"],["onboarding.html","Profile","solar:user-circle-linear"]];
 const agro=[["agronomist-dashboard.html","Overview","solar:widget-2-linear"],["agronomist-farms.html","Assigned farms","solar:clipboard-list-linear"],["agronomist-reviews.html","Assessments","solar:chart-square-linear"],["onboarding.html","Profile","solar:user-circle-linear"]];
 const links=(role==="agronomist"?agro:farmer).map(([url,label,icon])=>'<a class="'+(url===active?"active":"")+'" href="'+url+'"><iconify-icon icon="'+icon+'" aria-hidden="true"></iconify-icon><span>'+label+"</span></a>").join("");
 document.getElementById("app").innerHTML='<div class="app-shell"><aside class="sidebar"><a class="side-brand" href="index.html"><img src="Assets/logo.png" alt=""><span>NILORA<small>FIELD INTELLIGENCE</small></span></a><nav class="side-nav">'+links+'</nav><div class="side-bottom"><div class="account-summary">'+avatarHtml+'<span class="account-details"><b>'+safeName+'</b><small>'+role+'</small></span></div><button id="logoutBtn"><iconify-icon icon="solar:logout-2-linear"></iconify-icon> Sign out</button></div></aside><main class="main-area"><header class="topbar"><div><b>'+title+'</b><small class="topbar-caption">Your NILORA workspace</small></div><div class="topbar-account">'+avatarHtml+'<span>'+safeName+'</span></div></header><div class="content" id="pageContent"></div></main></div>';
 document.querySelectorAll("img.account-avatar").forEach(img=>img.addEventListener("error",()=>{const fallback=document.createElement("span");fallback.className="account-avatar account-initials";fallback.textContent=initials;img.replaceWith(fallback)}));
 document.getElementById("logoutBtn").onclick=async()=>{await db.auth.signOut();location.href="index.html"};
};