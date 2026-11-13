(async()=>{
 const p=await NILORA.requireRole(["farmer"]);if(!p)return;
 NILORA.mount({title:"مزارعي",active:"farmer-farms.html",role:"farmer"});
 const r=document.getElementById("pageContent"),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function load(){
  const rows=await NILORA_DATA.farms();
  r.innerHTML='<div class="page-heading"><div><h1>مزارعي</h1><p>سجّل موقع المزرعة بدقة حتى نقدر نجيب بيانات الأقمار الصناعية المناسبة لها.</p></div></div>'+
  '<div class="card"><h2>إضافة مزرعة</h2><form id="farmForm"><div class="form-grid">'+
  '<div class="field"><label>اسم المزرعة *</label><input name="name" required></div>'+
  '<div class="field"><label>المحافظة</label><input name="governorate" placeholder="مثال: المنوفية"></div>'+
  '<div class="field"><label>القرية / المركز</label><input name="locality"></div>'+
  '<div class="field"><label>المساحة (فدان)</label><input name="area_feddan" type="number" min=".01" step=".01"></div>'+
  '<div class="field"><label>خط العرض Latitude</label><input name="latitude" type="number" min="-90" max="90" step="any" placeholder="مثال: 30.56"></div>'+
  '<div class="field"><label>خط الطول Longitude</label><input name="longitude" type="number" min="-180" max="180" step="any" placeholder="مثال: 31.01"></div>'+
  '<div class="field full"><label>مصدر المياه</label><select name="water_source"><option value="">لم يُحدد</option><option>ترعة</option><option>مياه جوفية</option><option>مختلط</option><option>أخرى</option></select></div></div>'+
  '<div class="notice">الإحداثيات مطلوبة لتحديد نقطة البيانات المناخية. يمكنك الحصول عليها من تطبيق الخرائط عند الوقوف داخل المزرعة. لا نستخدم موقعك الحالي تلقائياً.</div>'+
  '<button class="btn">حفظ المزرعة</button><div id="fm" class="message"></div></form></div>'+
  '<div class="card panel"><h2>المزارع المسجلة</h2>'+(rows.length?'<div class="table-wrap"><table><tr><th>المزرعة</th><th>الموقع</th><th>المساحة</th><th>الإحداثيات</th></tr>'+rows.map(f=>'<tr><td>'+esc(f.name)+'</td><td>'+esc([f.locality,f.governorate].filter(Boolean).join("، ")||"—")+'</td><td>'+(f.area_feddan??"—")+'</td><td>'+(f.latitude!=null&&f.longitude!=null?esc(f.latitude)+", "+esc(f.longitude):"غير مضافة")+'</td></tr>').join("")+'</table></div>':'<div class="empty">لم تسجل أي مزرعة بعد.</div>')+'</div>';
  document.getElementById("farmForm").onsubmit=async e=>{
   e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));
   d.area_feddan=d.area_feddan?Number(d.area_feddan):null;d.latitude=d.latitude?Number(d.latitude):null;d.longitude=d.longitude?Number(d.longitude):null;
   Object.keys(d).forEach(k=>{if(d[k]==="")d[k]=null});
   if((d.latitude==null)!==(d.longitude==null)){const m=document.getElementById("fm");m.textContent="أدخل خط العرض وخط الطول معاً، أو اتركهما فارغين.";m.className="message show error";return}
   try{await NILORA_DATA.addFarm(d);await load()}catch(x){const m=document.getElementById("fm");m.textContent=x.message;m.className="message show error"}
  };
 }
 try{await load()}catch(e){r.innerHTML='<div class="notice error">'+esc(e.message)+'</div>'}
})();