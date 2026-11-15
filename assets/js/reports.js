(()=> {
const $=id=>document.getElementById(id);
const tbody=$("reports-body"),empty=$("empty-state"),table=$("table-wrap"),preview=$("report-preview");
let allReports=[],filtered=[],page=1,selected=null,charts=[];
const pageSize=10;
const guidance={
 heat_monitoring:{title:"Monitor heat stress conditions",reason:"The saved climate record showed a high daily maximum temperature. This is a screening signal, not proof of crop stress.",action:"Inspect the field early in the day. Check leaf condition, soil moisture, and irrigation equipment before changing irrigation timing or volume.",benefit:"Consistent scouting can help identify visible heat stress earlier and prompt timely field checks."},
 rainfall_inspection:{title:"Inspect drainage after rainfall",reason:"The saved precipitation estimate reached the recorded level during the recent period.",action:"Check low spots, drains, and areas where water may collect. Record any waterlogging and confirm conditions on the ground.",benefit:"Checking drainage after rainfall may help identify standing water and waterlogging risks sooner."},
 humidity_scouting:{title:"Scout for possible fungal symptoms",reason:"The saved relative humidity observations indicate conditions worth checking. Humidity alone does not confirm a disease.",action:"Inspect leaves and dense canopy areas for spots, mould, or unusual changes. Photograph symptoms and consult an agricultural engineer before treatment.",benefit:"Regular scouting may help detect symptoms earlier. It cannot diagnose disease or justify pesticide use without confirmation."},
 routine_scouting:{title:"Continue routine field scouting",reason:"The available climate observations did not trigger the preliminary alert rules used at the time of analysis.",action:"Continue regular crop inspections and monitor soil moisture and irrigation performance. Record changes and investigate unusual symptoms.",benefit:"Routine monitoring supports earlier awareness of changing field conditions."},
 insufficient_climate_data:{title:"More climate data is needed",reason:"There were not enough distinct observation days to run the preliminary screening rules reliably.",action:"Check the farm location and field profile, then run the analysis again when more observations are available. Do not make agronomic changes based on incomplete data.",benefit:"Improving data coverage can make future screening more useful."}
};
const dateText=v=>v?new Date(v).toLocaleString("en",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const dayText=v=>v?new Date(v+"T00:00:00").toLocaleDateString("en",{month:"short",day:"numeric"}):"";
const showToast=t=>{const el=$("toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),4500)};
function destroyCharts(){charts.forEach(c=>c.destroy());charts=[]}
function fieldName(r){return r.fields?.name||r.result?.field?.name||"Field"}
function cropName(r){return r.result?.field?.crop||r.crop_code||"Not specified"}
function reportStatus(r){return r.status==="ready_for_review"||r.status==="reviewed"?"Completed":"Insufficient data"}
function renderTable(){
 filtered=allReports.filter(r=>{
  const field=$("field-filter").value,from=$("from-date").value,to=$("to-date").value,q=$("search-report").value.trim().toLowerCase();
  const date=new Date(r.created_at).toISOString().slice(0,10);
  return (!field||r.field_id===field)&&(!from||date>=from)&&(!to||date<=to)&&(!q||(fieldName(r)+" "+cropName(r)).toLowerCase().includes(q));
 });
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);
 const start=(page-1)*pageSize,items=filtered.slice(start,start+pageSize);tbody.replaceChildren();
 $("report-count").textContent=filtered.length+" report"+(filtered.length===1?"":"s");
 empty.hidden=filtered.length>0;table.hidden=filtered.length===0;
 items.forEach(r=>{
  const tr=document.createElement("tr");
  const cells=[
   ["<strong>"+(fieldName(r)+" Analysis").replace(/[&<>"]/g,"")+"</strong><small>NILORA Rules Engine</small>"],
   ["<strong>"+fieldName(r).replace(/[&<>"]/g,"")+"</strong><small>"+(r.fields?.farms?.name||"Farm")+"</small>"],
   ["<strong>"+cropName(r).replace(/[&<>"]/g,"")+"</strong>"],
   ["<strong>"+dateText(r.created_at)+"</strong>"],
   ['<span class="pill '+(r.status==="insufficient_data"?"warn":"")+'">'+reportStatus(r)+'</span>']
  ];
  cells.forEach(([html])=>{const td=document.createElement("td");td.innerHTML=html;tr.append(td)});
  const actions=document.createElement("td"),wrap=document.createElement("div");wrap.className="row-actions";
  const view=document.createElement("button");view.className="small-btn";view.textContent="View";view.addEventListener("click",()=>openReport(r));
  const download=document.createElement("button");download.className="small-btn";download.textContent="PDF";download.addEventListener("click",()=>{openReport(r);setTimeout(downloadPdf,80)});
  wrap.append(view,download);actions.append(wrap);tr.append(actions);tbody.append(tr);
 });
 $("page-label").textContent=filtered.length?("Showing "+(start+1)+"–"+Math.min(start+pageSize,filtered.length)+" of "+filtered.length+" reports"):"Showing 0 reports";
 $("prev-page").disabled=page<=1;$("next-page").disabled=page>=pages;
}
function addSummary(label,value){const el=document.createElement("div");el.className="summary-card";const s=document.createElement("span"),b=document.createElement("b");s.textContent=label;b.textContent=value||"Not provided";el.append(s,b);$("summary-grid").append(el)}
function addEvidence(item){const el=document.createElement("div");el.className="evidence";const s=document.createElement("span"),b=document.createElement("b");s.textContent=item.label||item.metric||"Climate metric";b.textContent=(item.value??"—")+" "+(item.unit||"");el.append(s,b);$("evidence-grid").append(el)}
function chartCard(title,parameter,color,type="line"){
 const rows=(selected.result?.climate_series||[]).filter(x=>x.parameter===parameter).sort((a,b)=>a.observed_on.localeCompare(b.observed_on));
 if(!rows.length)return;
 const card=document.createElement("div");card.className="chart-card";const h=document.createElement("h4");h.textContent=title;const area=document.createElement("div");area.className="chart-area";const canvas=document.createElement("canvas");area.append(canvas);card.append(h,area);$("report-charts").append(card);
 charts.push(new Chart(canvas,{type,data:{labels:rows.map(x=>dayText(x.observed_on)),datasets:[{label:title,data:rows.map(x=>Number(x.value)),borderColor:color,backgroundColor:color+"22",fill:type==="line",tension:.3,borderRadius:4,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:9},maxTicksLimit:7}},y:{grid:{color:"#edf0e8"},ticks:{font:{size:9}}}}}}));
}
function openReport(r){
 selected=r;destroyCharts();$("summary-grid").replaceChildren();$("evidence-grid").replaceChildren();$("recommendation-grid").replaceChildren();$("limitations-list").replaceChildren();$("report-charts").replaceChildren();
 const result=r.result||{},field=result.field||{};
 $("preview-title").textContent=(field.name||fieldName(r))+" Analysis Report";
 $("preview-meta").textContent="Generated "+dateText(r.created_at)+" · Report ID "+r.id;
 addSummary("Field",field.name||fieldName(r));addSummary("Crop",field.crop||r.crop_code);addSummary("Analysis date",dateText(r.created_at));addSummary("Result",reportStatus(r));
 (result.evidence||[]).forEach(addEvidence);
 if(!(result.evidence||[]).length){const e=document.createElement("div");e.className="muted-note";e.textContent="No climate evidence was saved in this historical record."; $("evidence-grid").append(e)}
 const series=result.climate_series||[];chartCard("Daily maximum temperature","T2M_MAX","#556d4a");chartCard("Daily rainfall","PRECTOTCORR","#a4ac86","bar");if(!series.some(x=>x.parameter==="PRECTOTCORR"))chartCard("Daily rainfall","IMERG_PRECTOT","#a4ac86","bar");chartCard("Relative humidity","RH2M","#a67c52");
 $("chart-note").textContent=series.length?"Charts use the climate observations saved with this analysis. They are a historical snapshot and are not refreshed from current weather data.":"This report predates historical climate-series snapshots. Its saved evidence and recommendations are available above, but daily chart data was not stored for this older analysis.";
 (result.recommendations||[]).forEach(item=>{
  const g=guidance[item.code]||{title:item.title||"Field guidance",reason:item.reason||"Saved recommendation",action:item.action||"Review the field and confirm conditions before acting.",benefit:"Supports informed field monitoring."};
  const el=document.createElement("article");el.className="recommendation";
  const tag=document.createElement("span");tag.className="pill "+(item.priority==="watch"?"warn":"");tag.textContent=item.priority==="watch"?"Priority · Watch":"Guidance";
  const h=document.createElement("h4");h.textContent=g.title;
  const reason=document.createElement("p");reason.textContent=g.reason;
  const action=document.createElement("p");action.className="action";action.textContent="Recommended action: "+g.action;
  const benefit=document.createElement("p");benefit.textContent="Potential benefit: "+g.benefit;
  el.append(tag,h,reason,action,benefit);$("recommendation-grid").append(el);
 });
 if(!(result.recommendations||[]).length){const p=document.createElement("p");p.className="muted-note";p.textContent="No recommendations were saved for this analysis."; $("recommendation-grid").append(p)}
 (result.limitations||r.limitations||[]).forEach(line=>{const li=document.createElement("li");li.textContent=line;$("limitations-list").append(li)});
 preview.classList.add("open");preview.scrollIntoView({behavior:"smooth",block:"start"});
}
function downloadPdf(){
 if(!selected)return;
 if(!window.jspdf?.jsPDF){window.print();return}
 const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"}),result=selected.result||{},field=result.field||{};
 const margin=16,width=178;let y=20;
 const line=(txt,size=10,bold=false,color=[45,58,39])=>{doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(size);doc.setTextColor(...color);const lines=doc.splitTextToSize(String(txt??"—"),width);if(y+lines.length*5>278){doc.addPage();y=18}doc.text(lines,margin,y);y+=lines.length*5+2};
 doc.setFillColor(47,61,40);doc.rect(0,0,210,34,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(20);doc.text("NILORA",margin,16);doc.setFontSize(10);doc.text("FIELD ANALYSIS REPORT",margin,25);y=44;
 line(field.name||fieldName(selected),16,true);line("Analysis date: "+dateText(selected.created_at));line("Crop: "+(field.crop||selected.crop_code||"Not specified"));line("Status: "+reportStatus(selected));y+=3;
 line("CLIMATE EVIDENCE",12,true);(result.evidence||[]).forEach(e=>line((e.label||e.metric)+": "+e.value+" "+(e.unit||"")+" · "+(e.observations??"")+" observations"));
 y+=3;line("RECOMMENDATIONS & ACTIONS",12,true);
 (result.recommendations||[]).forEach(item=>{const g=guidance[item.code]||{title:item.title||"Field guidance",reason:item.reason||"",action:item.action||"",benefit:""};line(g.title,10,true);line(g.reason);line("Action: "+g.action);line("Potential benefit: "+g.benefit);y+=2});
 const chartCanvases=$("report-charts").querySelectorAll("canvas");if(chartCanvases.length){y+=3;line("SAVED CLIMATE CHARTS",12,true);for(const canvas of chartCanvases){if(y+72>278){doc.addPage();y=18}const label=canvas.closest(".chart-card")?.querySelector("h4")?.textContent||"Climate chart";line(label,9,true);try{doc.addImage(canvas.toDataURL("image/png"),"PNG",margin,y,width,58);y+=63}catch(e){line("Chart image unavailable in this export.",8)}}} y+=2;line("DATA SOURCE & LIMITATIONS",12,true);line("Climate data source: NASA POWER. Values are gridded estimates and may differ from conditions measured inside the field.");
 (result.limitations||selected.limitations||[]).forEach(x=>line("• "+x,9));
 line("Generated by NILORA · Smart Agro Intelligence",8,false,[100,108,96]);
 const safe=(field.name||"field").replace(/[^a-z0-9-_]+/gi,"-").toLowerCase();doc.save("NILORA-"+safe+"-"+new Date(selected.created_at).toISOString().slice(0,10)+".pdf");
}
async function init(){
 try{
  const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user){location.replace("signup.html");return}
  const {data,error}=await db.from("crop_assessments").select("id,field_id,crop_code,status,created_at,result,limitations,inputs,fields!inner(name,farm_id,farms!inner(name,owner_id))").eq("fields.farms.owner_id",user.id).order("created_at",{ascending:false}).limit(500);
  if(error)throw error;allReports=data||[];
  const fieldSelect=$("field-filter"),seen=new Map();allReports.forEach(r=>{if(r.field_id&&!seen.has(r.field_id))seen.set(r.field_id,fieldName(r))});
  [...seen].forEach(([id,name])=>{const o=document.createElement("option");o.value=id;o.textContent=name;fieldSelect.append(o)});
  renderTable();
 }catch(e){console.error("Reports loading failed:",e);showToast("Could not load saved reports. Check your connection and sign-in.");empty.hidden=false;table.hidden=true}
}
["field-filter","from-date","to-date","search-report"].forEach(id=>$(id).addEventListener("input",()=>{page=1;renderTable()}));
$("reset-filters").addEventListener("click",()=>{$("field-filter").value="";$("from-date").value="";$("to-date").value="";$("search-report").value="";page=1;renderTable()});
$("prev-page").addEventListener("click",()=>{page=Math.max(1,page-1);renderTable()});$("next-page").addEventListener("click",()=>{page++;renderTable()});
$("close-preview").addEventListener("click",()=>{preview.classList.remove("open");destroyCharts()});$("download-pdf").addEventListener("click",downloadPdf);
init();
})();