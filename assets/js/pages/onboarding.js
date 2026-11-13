(async()=>{
 const app=document.getElementById("app");
 const {data:{session}}=await db.auth.getSession();
 if(!session){location.href="signup.html";return}
 const {data:profile,error}=await db.from("profiles").select("*").eq("id",session.user.id).single();
 if(error||!profile){app.innerHTML='<div class="setup-shell"><div class="setup-card">We could not load your profile. Please sign out and try again.</div></div>';return}
 if(profile.account_status!=="active"){await db.auth.signOut();location.href="signup.html";return}
 if(profile.onboarding_completed){location.href=profile.role==="agronomist"?"agronomist-dashboard.html":"farmer-dashboard.html";return}
 const user=session.user,meta=user.user_metadata||{};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const value=(v)=>esc(v||"");
 const defaultName=profile.full_name||meta.full_name||meta.name||"";
 const avatar=meta.avatar_url||meta.picture||profile.avatar_url||"";
 app.innerHTML='<div class="setup-shell">'+
 '<div class="setup-intro"><span class="dash-eyebrow">STEP 01 — YOUR NILORA PROFILE</span><h1>Let’s set up your workspace.</h1><p>Tell us who you are. Farmers can then map their field boundary so NILORA can calculate its measurements and prepare the right dashboard.</p></div>'+
 '<div class="setup-progress"><div class="progress-step active"><span>1</span> Profile & role</div><div class="progress-step active"><span>2</span> Farm location</div><div class="progress-step"><span>3</span> Your dashboard</div></div>'+
 '<form id="profileSetup">'+
 '<section class="setup-card"><h2>Your profile</h2><p>These details identify your account and help us tailor the workspace.</p>'+
 '<div class="setup-grid"><div class="setup-field"><label for="fullName">FULL NAME *</label><input id="fullName" name="full_name" required maxlength="100" value="'+value(defaultName)+'" placeholder="Your full name"></div>'+
 '<div class="setup-field"><label for="email">GOOGLE ACCOUNT</label><input id="email" value="'+esc(user.email||"")+'" disabled></div>'+
 '<div class="setup-field"><label for="phone">PHONE NUMBER</label><input id="phone" name="phone" type="tel" value="'+value(profile.phone)+'" placeholder="+20…"></div>'+
 '<div class="setup-field"><label for="organization">ORGANIZATION / FARM NAME</label><input id="organization" name="organization" value="'+value(profile.organization)+'" placeholder="Optional"></div></div>'+
 '<div class="setup-field"><label>HOW WILL YOU USE NILORA? *</label><div class="role-options">'+
 '<div class="role-option"><input type="radio" id="roleFarmer" name="role" value="farmer" '+(profile.role!=="agronomist"?"checked":"")+'><label for="roleFarmer"><iconify-icon icon="solar:leaf-linear"></iconify-icon><span><b>Farmer</b><small>Map your farm, monitor fields, crops and climate conditions.</small></span></label></div>'+
 '<div class="role-option"><input type="radio" id="roleAgronomist" name="role" value="agronomist" '+(profile.role==="agronomist"?"checked":"")+'><label for="roleAgronomist"><iconify-icon icon="solar:microscope-linear"></iconify-icon><span><b>Agronomist</b><small>Review assigned farms, crop assessments and field evidence.</small></span></label></div></div></div>'+
 '<div id="agronomistFields" class="setup-grid '+(profile.role==="agronomist"?"":"hidden")+'"><div class="setup-field"><label for="experience">YEARS OF EXPERIENCE</label><input id="experience" name="experience_years" type="number" min="0" max="80" value="'+esc(profile.experience_years??"")+'" placeholder="e.g. 5"></div><div class="setup-field"><label for="professionalArea">GOVERNORATE / WORK AREA</label><input id="professionalArea" name="governorate" value="'+value(profile.governorate)+'" placeholder="e.g. Monufia"></div></div>'+
 '<div id="agronomistNotice" class="agronomist-note '+(profile.role==="agronomist"?"":"hidden")+'">Agronomist accounts are reviewed by the NILORA team. Your professional dashboard will unlock after approval.</div>'+
 '</section>'+
 '<section id="farmerSetup" class="setup-card '+(profile.role==="agronomist"?"hidden":"")+'"><h2>Map your farm</h2><p>Find your farm on the satellite map, then draw its boundary. NILORA will calculate the approximate area, longest side, width and perimeter from your polygon.</p>'+
 '<div class="setup-grid"><div class="setup-field"><label for="farmName">FARM NAME *</label><input id="farmName" maxlength="120" value="'+value(profile.organization)+'" placeholder="e.g. Mubarak Family Farm"></div><div class="setup-field"><label for="farmGovernorate">GOVERNORATE *</label><input id="farmGovernorate" value="'+value(profile.governorate||"Monufia")+'" required placeholder="e.g. Monufia"></div><div class="setup-field"><label for="farmLocality">VILLAGE / LOCALITY</label><input id="farmLocality" value="'+value(profile.locality)+'" placeholder="Village or nearby town"></div><div class="setup-field"><label for="waterSource">WATER SOURCE</label><select id="waterSource"><option value="">Select water source</option><option value="Nile canal">Nile canal</option><option value="Groundwater">Groundwater</option><option value="Mixed">Mixed</option><option value="Other">Other</option></select></div></div>'+
 '<div class="map-toolbar"><p><b>1.</b> Navigate to your farm. <b>2.</b> Draw the full field boundary using the polygon or rectangle tool.</p><div class="map-actions"><button type="button" id="locateMe"><iconify-icon icon="solar:map-point-wave-linear"></iconify-icon> Use my location</button><button type="button" id="clearBoundary">Clear boundary</button></div></div>'+
 '<div id="farmMap" class="farm-map" aria-label="NASA satellite map for drawing farm boundary"></div>'+
 '<div class="map-help">NASA imagery is provided by NASA GIBS. Use the layer switcher to change the map background. The outline must follow the actual field edges; measurements are calculated from the boundary you draw, not automatically detected by NASA.</div>'+
 '<div id="measurementPanel" class="measurement-grid"><div class="measurement-item"><small>FIELD AREA</small><b id="measureArea">—</b><em>feddan</em></div><div class="measurement-item"><small>LONGEST DIMENSION</small><b id="measureLength">—</b><em>meters</em></div><div class="measurement-item"><small>APPROX. WIDTH</small><b id="measureWidth">—</b><em>meters</em></div><div class="measurement-item"><small>PERIMETER</small><b id="measurePerimeter">—</b><em>meters</em></div></div>'+
 '<div class="setup-grid" style="margin-top:13px"><div class="setup-field"><label for="fieldName">FIELD NAME *</label><input id="fieldName" maxlength="120" value="Main Field" required></div><div class="setup-field"><label for="crop">CURRENT CROP</label><select id="crop"><option value="">Not specified</option><option value="Wheat">Wheat</option><option value="Rice">Rice</option><option value="Maize">Maize</option><option value="Cotton">Cotton</option><option value="Clover">Clover</option><option value="Vegetables">Vegetables</option><option value="Other">Other</option></select></div><div class="setup-field"><label for="soilType">SOIL TYPE</label><select id="soilType"><option value="">Not specified</option><option value="Alluvial">Alluvial</option><option value="Sandy">Sandy</option><option value="Clay">Clay</option><option value="Sandy loam">Sandy loam</option><option value="Other">Other</option></select></div><div class="setup-field"><label for="irrigation">IRRIGATION METHOD</label><select id="irrigation"><option value="">Not specified</option><option value="Flood">Flood</option><option value="Drip">Drip</option><option value="Sprinkler">Sprinkler</option><option value="Other">Other</option></select></div><div class="setup-field setup-full"><label for="fieldNotes">FIELD NOTES</label><textarea id="fieldNotes" placeholder="Optional notes about this field…"></textarea></div></div>'+
 '</section>'+
 '<div id="setupMessage" class="setup-message" role="status" aria-live="polite"></div>'+
 '<div class="setup-actions"><a class="setup-cancel" href="#" id="signOutLink">Sign out and return to login</a><button class="setup-submit" id="saveSetup" type="submit">Save profile & open NILORA <iconify-icon icon="solar:arrow-right-linear"></iconify-icon></button></div>'+
 '</form></div>';
 const form=document.getElementById("profileSetup"),farmerPanel=document.getElementById("farmerSetup"),agroPanel=document.getElementById("agronomistFields"),agroNote=document.getElementById("agronomistNotice");
 const selectedRole=()=>form.querySelector('input[name="role"]:checked').value;
 form.querySelectorAll('input[name="role"]').forEach(el=>el.addEventListener("change",()=>{
  const farmer=selectedRole()==="farmer";farmerPanel.classList.toggle("hidden",!farmer);agroPanel.classList.toggle("hidden",farmer);agroNote.classList.toggle("hidden",farmer);
  if(farmer&&!mapReady)initMap();
  if(mapReady&&!farmer)setTimeout(()=>map.invalidateSize(),100);
 }));
 let map=null,mapReady=false,drawnItems=null,drawnFeature=null,farmMarker=null,measurements=null;
 const fmt=(v,d=2)=>Number(v).toLocaleString("en-US",{maximumFractionDigits:d});
 function dimensionsFromRing(ring){
  const pts=ring.slice(0,-1),lat0=pts.reduce((s,p)=>s+p[1],0)/pts.length,lon0=pts.reduce((s,p)=>s+p[0],0)/pts.length;
  const cos=Math.cos(lat0*Math.PI/180),xy=pts.map(p=>[(p[0]-lon0)*111320*cos,(p[1]-lat0)*110540]);
  const mx=xy.reduce((s,p)=>s+p[0],0)/xy.length,my=xy.reduce((s,p)=>s+p[1],0)/xy.length;
  let xx=0,yy=0,xyc=0;for(const p of xy){const x=p[0]-mx,y=p[1]-my;xx+=x*x;yy+=y*y;xyc+=x*y}
  const angle=.5*Math.atan2(2*xyc,xx-yy),ux=Math.cos(angle),uy=Math.sin(angle),vx=-uy,vy=ux;
  const along=xy.map(p=>(p[0]-mx)*ux+(p[1]-my)*uy),across=xy.map(p=>(p[0]-mx)*vx+(p[1]-my)*vy);
  const len=Math.max(...along)-Math.min(...along),wid=Math.max(...across)-Math.min(...across);
  return {length:Math.max(len,wid),width:Math.min(len,wid)};
 }
 function updateMeasurements(feature){
  try{
   if(!feature||feature.geometry.type!=="Polygon")throw new Error("Draw a closed polygon around the field.");
   const ring=feature.geometry.coordinates[0];if(!ring||ring.length<4)throw new Error("The field boundary needs at least three points.");
   const areaM2=turf.area(feature),perimeterM=turf.length(feature,{units:"kilometers"})*1000,dim=dimensionsFromRing(ring),center=turf.centroid(feature).geometry.coordinates;
   if(!Number.isFinite(areaM2)||areaM2<=0||!Number.isFinite(perimeterM)||perimeterM<=0)throw new Error("The boundary could not be measured. Please redraw it.");
   measurements={areaM2,areaFeddan:areaM2/4200.833,lengthM:dim.length,widthM:dim.width,perimeterM,center};
   document.getElementById("measureArea").textContent=fmt(measurements.areaFeddan,3);
   document.getElementById("measureLength").textContent=fmt(dim.length,1);
   document.getElementById("measureWidth").textContent=fmt(dim.width,1);
   document.getElementById("measurePerimeter").textContent=fmt(perimeterM,1);
   if(farmMarker)farmMarker.remove();farmMarker=L.marker([center[1],center[0]]).addTo(map).bindPopup("Approximate farm center");
   document.getElementById("setupMessage").className="setup-message";
  }catch(e){measurements=null;document.getElementById("setupMessage").textContent=e.message;document.getElementById("setupMessage").className="setup-message show error"}
 }
 function initMap(){
  if(mapReady||typeof L==="undefined"||typeof turf==="undefined")return;
  mapReady=true;
  map=L.map("farmMap",{center:[30.56,31.01],zoom:12,preferCanvas:true});
  const nasa=L.tileLayer("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",{minZoom:2,maxZoom:18,maxNativeZoom:9,attribution:'Imagery: <a href="https://earthdata.nasa.gov/" target="_blank" rel="noopener">NASA GIBS</a>'});
  const osm=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'});
  nasa.addTo(map);L.control.layers({"NASA satellite imagery":nasa,"Street map":osm},null,{position:"topright",collapsed:true}).addTo(map);
  drawnItems=new L.FeatureGroup();map.addLayer(drawnItems);
  map.addControl(new L.Control.Draw({position:"topleft",draw:{polygon:{allowIntersection:false,showArea:true,shapeOptions:{color:"#2f6b45",weight:3,fillOpacity:.18}},rectangle:{shapeOptions:{color:"#2f6b45",weight:3,fillOpacity:.18}},polyline:false,circle:false,circlemarker:false,marker:false},edit:{featureGroup:drawnItems,remove:true}}));
  map.on(L.Draw.Event.CREATED,e=>{drawnItems.clearLayers();drawnItems.addLayer(e.layer);drawnFeature=e.layer.toGeoJSON();updateMeasurements(drawnFeature)});
  map.on(L.Draw.Event.EDITED,()=>{const layer=drawnItems.getLayers()[0];drawnFeature=layer?layer.toGeoJSON():null;if(drawnFeature)updateMeasurements(drawnFeature)});
  map.on(L.Draw.Event.DELETED,()=>{drawnFeature=null;measurements=null;if(farmMarker){farmMarker.remove();farmMarker=null}["measureArea","measureLength","measureWidth","measurePerimeter"].forEach(id=>document.getElementById(id).textContent="—")});
  setTimeout(()=>map.invalidateSize(),150);
 }
 if(selectedRole()==="farmer")initMap();
 document.getElementById("locateMe").onclick=()=>{
  if(!navigator.geolocation){show("Location services are not supported by this browser.","error");return}
  navigator.geolocation.getCurrentPosition(pos=>{
   const ll=[pos.coords.latitude,pos.coords.longitude];map.setView(ll,16);
   if(farmMarker)farmMarker.remove();farmMarker=L.marker(ll).addTo(map).bindPopup("Your current location").openPopup();
  },()=>show("We could not access your location. You can still find the farm manually on the map." ,"error"),{enableHighAccuracy:true,timeout:12000});
 };
 document.getElementById("clearBoundary").onclick=()=>{
  if(drawnItems)drawnItems.clearLayers();drawnFeature=null;measurements=null;if(farmMarker){farmMarker.remove();farmMarker=null}
  ["measureArea","measureLength","measureWidth","measurePerimeter"].forEach(id=>document.getElementById(id).textContent="—");
 };
 function show(message,kind="error"){const el=document.getElementById("setupMessage");el.textContent=message;el.className="setup-message show "+kind}
 document.getElementById("signOutLink").onclick=async e=>{e.preventDefault();await db.auth.signOut();location.href="signup.html"};
 form.addEventListener("submit",async e=>{
  e.preventDefault();const save=document.getElementById("saveSetup");save.disabled=true;save.textContent="Saving your NILORA workspace…";
  let farmId=null,fieldId=null;
  try{
   const role=selectedRole(),fullName=document.getElementById("fullName").value.trim();
   if(!fullName)throw new Error("Please enter your full name.");
   if(role==="farmer"){
    if(!measurements||!drawnFeature)throw new Error("Please draw your field boundary on the NASA map before saving.");
    const farmName=document.getElementById("farmName").value.trim(),governorate=document.getElementById("farmGovernorate").value.trim();
    if(!farmName||!governorate)throw new Error("Please enter the farm name and governorate.");
    const farmResult=await db.from("farms").insert({owner_id:user.id,name:farmName,governorate,locality:document.getElementById("farmLocality").value.trim()||null,latitude:measurements.center[1],longitude:measurements.center[0],area_feddan:measurements.areaFeddan,water_source:document.getElementById("waterSource").value||null}).select("id").single();
    if(farmResult.error)throw farmResult.error;farmId=farmResult.data.id;
    const fieldResult=await db.from("fields").insert({farm_id:farmId,name:document.getElementById("fieldName").value.trim()||"Main Field",boundary_geojson:drawnFeature,area_feddan:measurements.areaFeddan,length_m:measurements.lengthM,width_m:measurements.widthM,perimeter_m:measurements.perimeterM,measurement_method:"user_drawn_polygon",current_crop:document.getElementById("crop").value||null,soil_type:document.getElementById("soilType").value||null,irrigation_type:document.getElementById("irrigation").value||null,notes:document.getElementById("fieldNotes").value.trim()||null}).select("id").single();
    if(fieldResult.error)throw fieldResult.error;fieldId=fieldResult.data.id;
   }
   const profileUpdate={full_name:fullName,phone:document.getElementById("phone").value.trim()||null,organization:document.getElementById("organization").value.trim()||null,role,onboarding_completed:true};
   if(role==="farmer"){
    profileUpdate.governorate=document.getElementById("farmGovernorate").value.trim();
    profileUpdate.locality=document.getElementById("farmLocality").value.trim()||null;
   }else{
    profileUpdate.governorate=document.getElementById("professionalArea").value.trim()||null;
    const exp=document.getElementById("experience").value;profileUpdate.experience_years=exp===""?null:Number(exp);
   }
   if(avatar)profileUpdate.avatar_url=avatar;
   const updated=await db.from("profiles").update(profileUpdate).eq("id",user.id).select("id").single();
   if(updated.error)throw updated.error;
   show("Your profile and farm workspace have been saved. Opening your dashboard…","success");
   setTimeout(()=>location.href=role==="agronomist"?"agronomist-dashboard.html":"farmer-dashboard.html",700);
  }catch(err){
   if(fieldId)await db.from("fields").delete().eq("id",fieldId);
   if(farmId)await db.from("farms").delete().eq("id",farmId);
   show(err.message||"We could not save your setup. Please try again.");
   save.disabled=false;save.innerHTML='Save profile & open NILORA <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>';
  }
 });
})();