(async()=>{
 const profile=await NILORA.requireRole(["farmer"]);if(!profile)return;
 NILORA.mount({title:"لوحة الفلاح",active:"farmer-dashboard.html",role:"farmer"});
 const root=document.getElementById("pageContent");
 const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const num=(value,d=1)=>Number.isFinite(Number(value))?Number(value).toLocaleString("ar-EG",{maximumFractionDigits:d}):"—";
 const fieldFarm=f=>Array.isArray(f.farms)?f.farms[0]:f.farms;
 const icon=(name)=>'<iconify-icon icon="solar:'+name+'-linear" aria-hidden="true"></iconify-icon>';
 function renderClimate(data){
   const latest=data.latest||{},obs=data.observations||[];
   const metric=(key,label,unit,ico)=>{const v=latest[key];return '<div class="climate-metric"><span class="climate-metric-icon">'+icon(ico)+'</span><small>'+label+'</small><b>'+(v?num(v.value,1):"—")+' <em>'+unit+'</em></b><span class="metric-date">'+(v?esc(v.date):"لا توجد قراءة")+'</span></div>'};
   const temps=obs.filter(x=>x.parameter==="T2M").slice(-7);
   const maxTemp=Math.max(1,...temps.map(x=>Number(x.value)||0));
   const bars=temps.map(x=>'<div class="weather-bar-col"><div class="weather-bar-value">'+num(x.value,0)+'°</div><div class="weather-bar" style="height:'+Math.max(8,Math.round((Number(x.value)||0)/maxTemp*74))+'px"></div><small>'+esc(x.date.slice(5))+'</small></div>').join("");
   root.querySelector("#climateResult").innerHTML=
    '<div class="climate-metrics">'+metric("T2M","متوسط الحرارة","°م","temperature")+
    metric("RH2M","الرطوبة النسبية","%","drop")+
    metric("PRECTOTCORR","الأمطار","مم/يوم","cloud-rain")+
    metric("ALLSKY_SFC_SW_DWN","الإشعاع الشمسي","kWh/m²","sun")+'</div>'+
    (temps.length?'<div class="weather-chart-wrap"><div class="weather-chart-title">متوسط الحرارة اليومي — آخر القراءات المتاحة</div><div class="weather-bars">'+bars+'</div></div>':'')+
    '<div class="source-meta"><b>المصدر: NASA POWER</b><span>تحديث الجلب: '+esc(new Date(data.fetched_at).toLocaleString("ar-EG"))+'</span><span>الفترة: '+esc(data.start_date)+' إلى '+esc(data.end_date)+'</span><p>هذه تقديرات مناخية شبكية عند إحداثيات المزرعة، وليست قياسات من حساس داخل الحقل. قد تتأخر أحدث البيانات عن اليوم الحالي.</p><a href="'+esc(data.source_url)+'" target="_blank" rel="noopener">فتح بيانات NASA POWER الأصلية ↗</a></div>';
 }
 async function loadClimate(fieldId){
   const box=root.querySelector("#climateResult");box.innerHTML='<div class="data-loading">جارٍ جلب البيانات المناخية من NASA POWER…</div>';
   try{const data=await NILORA_DATA.nasaPower(fieldId);renderClimate(data)}
   catch(error){box.innerHTML='<div class="data-error">تعذر جلب البيانات: '+esc(error.message)+'<br><small>تأكد من تسجيل إحداثيات المزرعة واتصال الحساب، ثم حاول مرة أخرى.</small></div>'}
 }
 try{
  const [farms,fields]=await Promise.all([NILORA_DATA.farms(),NILORA_DATA.fields()]);
  const totalArea=farms.reduce((sum,f)=>sum+(Number(f.area_feddan)||0),0);
  const geocoded=fields.filter(f=>{const farm=fieldFarm(f);return farm&&Number.isFinite(Number(farm.latitude))&&Number.isFinite(Number(farm.longitude))&&farm.latitude!==null&&farm.longitude!==null});
  const fieldOptions=fields.map(f=>{const farm=fieldFarm(f);const ok=farm&&farm.latitude!==null&&farm.longitude!==null;return '<option value="'+esc(f.id)+'" '+(!ok?"disabled":"")+'>'+esc(f.name)+(farm?.name?" — "+esc(farm.name):"")+(!ok?" (أضف إحداثيات المزرعة)":"")+'</option>'}).join("");
  root.innerHTML=
   '<section class="farmer-welcome"><div><span class="eyebrow">NILORA • الزراعة الذكية</span><h1>أهلاً يا '+esc(profile.full_name||"مزارعنا")+' 👋</h1><p>تابع أرضك وافهم الظروف المحيطة بمحصولك من بيانات الأقمار الصناعية.</p></div><div class="welcome-actions"><a class="btn" href="farmer-farms.html">+ إضافة مزرعة</a><a class="btn secondary" href="farmer-fields.html">إضافة حقل</a></div></section>'+
   '<section class="farmer-stats"><article class="card stat-card"><span>مزارعي</span><strong>'+num(farms.length,0)+'</strong><small>المزارع المسجلة</small></article><article class="card stat-card"><span>حقولي</span><strong>'+num(fields.length,0)+'</strong><small>الحقول المسجلة</small></article><article class="card stat-card"><span>إجمالي المساحة</span><strong>'+num(totalArea,2)+'</strong><small>فدان مسجل</small></article></section>'+
   '<section class="card satellite-card"><div class="section-heading"><div><span class="eyebrow">بيانات من مصدر رسمي • NASA POWER</span><h2>الطقس والمناخ حول مزرعتك</h2><p>بيانات يومية من NASA POWER حسب إحداثيات المزرعة.</p></div><span class="source-pill">NASA POWER</span></div>'+
   (fields.length?'<div class="field-picker"><label for="climateField">اختر الحقل</label><select id="climateField">'+fieldOptions+'</select><button class="btn" id="refreshClimate" '+(!geocoded.length?"disabled":"")+'>تحديث البيانات</button></div>':'<div class="empty">سجّل مزرعة وحقل أولاً حتى نقدر نجيب بيانات مرتبطة بموقع أرضك. <a href="farmer-farms.html">إضافة مزرعة</a></div>')+
   '<div id="climateResult">'+(geocoded.length?'<div class="data-loading">جارٍ تجهيز البيانات…</div>':'<div class="data-empty">لا توجد إحداثيات للحقل حتى الآن. أضف خط العرض وخط الطول للمزرعة من صفحة «مزارعي» ثم ارجع هنا.</div>')+'</div></section>'+
   '<section class="dashboard-lower"><article class="card"><div class="section-heading"><div><h2>حقولك</h2><p>المحاصيل والمساحات المسجلة.</p></div><a href="farmer-fields.html">عرض الكل</a></div>'+
   (fields.length?'<div class="field-list">'+fields.slice(0,6).map(f=>'<div class="field-list-row"><span class="field-list-icon">'+icon("leaf")+'</span><div><b>'+esc(f.name)+'</b><small>'+esc(fieldFarm(f)?.name||"مزرعة غير محددة")+' • '+esc(f.current_crop||"لم يُحدد المحصول")+'</small></div><strong>'+(f.area_feddan?num(f.area_feddan,2)+" فدان":"—")+'</strong></div>').join("")+'</div>':'<div class="empty">لم تضف حقولاً بعد. <a href="farmer-fields.html">أضف أول حقل</a>.</div>')+'</article>'+
   '<article class="card data-roadmap"><div class="section-heading"><div><h2>مصادر بيانات الأقمار الصناعية</h2><p>هنضيفها تدريجياً بعد اختبار كل مصدر.</p></div></div><div class="roadmap-row"><span class="roadmap-dot active"></span><div><b>NASA POWER</b><small>بيانات المناخ اليومية متصلة في هذه النسخة.</small></div><span class="status-live">متصل</span></div><div class="roadmap-row"><span class="roadmap-dot"></span><div><b>GPM / IMERG</b><small>الخطوة التالية: أمطار الأقمار الصناعية بدقة تقارب 10 كم.</small></div><span class="status-next">قيد التجهيز</span></div><div class="roadmap-row"><span class="roadmap-dot"></span><div><b>Sentinel-2</b><small>الخطوة التالية: صور الحقول وحساب مؤشرات الغطاء النباتي.</small></div><span class="status-next">قيد التجهيز</span></div></article></section>'+
   '<p class="dashboard-disclaimer">مهم: المؤشرات المناخية تقديرات على مستوى شبكة جغرافية وليست بديلاً عن قياس التربة داخل الحقل أو رأي المهندس الزراعي.</p>';
  const select=root.querySelector("#climateField"),refresh=root.querySelector("#refreshClimate");
  if(select&&geocoded.length){const first=geocoded[0];select.value=first.id;refresh.disabled=false;refresh.onclick=()=>loadClimate(select.value);select.onchange=()=>loadClimate(select.value);loadClimate(first.id)}
 }catch(error){root.innerHTML='<div class="notice error">تعذر تحميل بيانات حسابك: '+esc(error.message)+'</div>'}
})();