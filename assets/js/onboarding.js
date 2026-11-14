(()=>{
const $=id=>document.getElementById(id),form=$("onboarding-form"),status=$("status"),save=$("save-btn"),locate=$("locate-btn");
let user=null,profile=null,marker=null,selected=null,map=null;
const say=(message,type="")=>{status.textContent=message;status.className="status "+type};
const fmt=n=>Number(n).toFixed(6);
function setPoint(lat,lng,zoom=true){
 selected={lat:Number(lat),lng:Number(lng)};
 if(marker)marker.setLatLng([selected.lat,selected.lng]);
 else{marker=L.marker([selected.lat,selected.lng],{draggable:true}).addTo(map);marker.on("dragend",()=>{const p=marker.getLatLng();selected={lat:p.lat,lng:p.lng};showCoords()})}
 showCoords();if(zoom)map.setView([selected.lat,selected.lng],15);
}
function showCoords(){$("lat-value").textContent=fmt(selected.lat);$("lng-value").textContent=fmt(selected.lng)}
function clearPoint(){selected=null;if(marker){map.removeLayer(marker);marker=null}$("lat-value").textContent="لم يتم التحديد";$("lng-value").textContent="لم يتم التحديد"}
function requestLocation(){
 if(!navigator.geolocation){say("المتصفح لا يدعم تحديد الموقع. اختار مكان المزرعة يدويًا على الخريطة.","error");return}
 locate.disabled=true;say("جاري تحديد موقعك… وافق على إذن الموقع من المتصفح.");
 navigator.geolocation.getCurrentPosition(pos=>{
  setPoint(pos.coords.latitude,pos.coords.longitude,true);
  say("تم تحديد موقعك. راجع العلامة وتأكد إنها على أرض المزرعة قبل الحفظ.","success");locate.disabled=false;
 },err=>{
  const messages={1:"إذن الموقع مرفوض. اسمح للموقع من إعدادات المتصفح أو اختار مكان المزرعة يدويًا.",2:"تعذر تحديد موقعك حاليًا. اختار موقع المزرعة يدويًا على الخريطة.",3:"انتهى وقت تحديد الموقع. جرّب تاني أو اختار الموقع يدويًا."};
  say(messages[err.code]||"تعذر تحديد الموقع. اختار المكان يدويًا على الخريطة.","error");locate.disabled=false;
 },{enableHighAccuracy:true,timeout:18000,maximumAge:0});
}
(async()=>{
 try{
  const {data:{user:authUser},error:authError}=await db.auth.getUser();
  if(authError||!authUser){location.replace("signup.html");return}user=authUser;
  const {data:existingProfile,error:profileError}=await db.from("profiles").select("full_name,role,phone,governorate,locality,onboarding_completed").eq("id",user.id).maybeSingle();
  if(profileError)throw profileError;profile=existingProfile;
  const meta=user.user_metadata||{};
  const accountName=[meta.full_name,meta.name,[meta.given_name,meta.family_name].filter(Boolean).join(" "),profile?.full_name,user.email?.split("@")[0]].find(v=>typeof v==="string"&&v.trim())?.trim()||"";
  $("owner-name").value=accountName;
  $("phone").value=profile?.phone||user.phone||"";
  if(profile?.governorate)$("governorate").value=profile.governorate;
  $("locality").value=profile?.locality||"";
  const {data:farm,error:farmError}=await db.from("farms").select("id,name,governorate,locality,latitude,longitude,area_feddan,water_source").eq("owner_id",user.id).limit(1).maybeSingle();
  if(farmError)throw farmError;
  if(farm){
   $("farm-name").value=farm.name||"";$("governorate").value=farm.governorate||$("governorate").value;$("locality").value=farm.locality||$("locality").value;$("area").value=farm.area_feddan||"";
   if(farm.latitude!=null&&farm.longitude!=null)selected={lat:Number(farm.latitude),lng:Number(farm.longitude)};
  }
  map=L.map("farm-map").setView(selected?[selected.lat,selected.lng]:[26.8,30.8],selected?14:6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  map.on("click",e=>setPoint(e.latlng.lat,e.latlng.lng,false));
  if(selected)setPoint(selected.lat,selected.lng,false);
  setTimeout(()=>map.invalidateSize(),150);
  if(!selected)requestLocation();
 }catch(e){console.error(e);say("حصلت مشكلة في تحميل بيانات الحساب. حدّث الصفحة وحاول تاني.","error")}
})();
locate.addEventListener("click",requestLocation);
$("clear-location").addEventListener("click",()=>{clearPoint();say("تم مسح الموقع. لازم تحدد موقع المزرعة قبل الحفظ.")});
form.addEventListener("submit",async e=>{
 e.preventDefault();if(!user||!map)return;
 if(!selected){say("حدد موقع المزرعة الأول.","error");return}
 const area=Number($("area").value),accountName=$("owner-name").value.trim();
 if(!accountName){say("مش قادرين نقرأ الاسم من حسابك. سجّل خروج وادخل تاني أو راجع بيانات الحساب.","error");return}
 if(!$("farm-name").value.trim()){say("اكتب اسم المزرعة.","error");return}\n if(!Number.isFinite(area)||area<=0){say("اكتب مساحة صحيحة للمزرعة.","error");return}
 save.disabled=true;save.textContent="جاري حفظ البيانات…";say("جاري حفظ بيانات المزرعة والإحداثيات في حسابك.");
 try{
  const profilePayload={full_name:accountName,phone:$("phone").value.trim()||null,governorate:$("governorate").value,locality:$("locality").value.trim()||null,onboarding_completed:false};
  const {data:profileSaved,error:profileSaveError}=await db.from("profiles").update(profilePayload).eq("id",user.id).select("id").single();
  if(profileSaveError)throw profileSaveError;
  if(!profileSaved?.id)throw new Error("تعذر العثور على ملف حسابك. سجّل خروج وادخل مرة تانية.");
  const farmPayload={owner_id:user.id,name:$("farm-name").value.trim(),governorate:$("governorate").value,locality:$("locality").value.trim()||null,latitude:selected.lat,longitude:selected.lng,area_feddan:area,water_source:$("water-source").value||null};
  const {data:existingFarm,error:findFarmError}=await db.from("farms").select("id").eq("owner_id",user.id).limit(1).maybeSingle();if(findFarmError)throw findFarmError;
  let farmId=existingFarm?.id;
  if(farmId){const {error}=await db.from("farms").update(farmPayload).eq("id",farmId);if(error)throw error}
  else{const {data,error}=await db.from("farms").insert(farmPayload).select("id").single();if(error)throw error;farmId=data.id}
  const fieldPayload={farm_id:farmId,name:"الحقل الرئيسي",area_feddan:area,current_crop:$("crop").value||null,irrigation_type:$("irrigation").value||null,notes:"تم إدخال البيانات أثناء إعداد حساب المزارع.",measurement_method:"manual"};
  const {data:existingField,error:findFieldError}=await db.from("fields").select("id").eq("farm_id",farmId).limit(1).maybeSingle();if(findFieldError)throw findFieldError;
  if(existingField?.id){const {error}=await db.from("fields").update(fieldPayload).eq("id",existingField.id);if(error)throw error}
  else{const {error}=await db.from("fields").insert(fieldPayload);if(error)throw error}
  const {error:completeError}=await db.from("profiles").update({onboarding_completed:true}).eq("id",user.id);if(completeError)throw completeError;
  localStorage.removeItem("nilora-farm-profile-preview");say("اتحفظت بياناتك وموقع المزرعة بنجاح. بنفتح لوحة التحكم…","success");setTimeout(()=>location.replace("farmer-dashboard.html"),700);
 }catch(err){console.error(err);say("مقدرناش نحفظ البيانات: "+(err.message||"خطأ غير معروف"),"error");save.disabled=false;save.innerHTML='حفظ وفتح لوحة التحكم <iconify-icon icon="solar:arrow-left-linear"></iconify-icon>'}
});
})();