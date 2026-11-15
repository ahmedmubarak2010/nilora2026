(()=> {
const $=id=>document.getElementById(id);
const tbody=$("reports-body"),empty=$("empty-state"),table=$("table-wrap"),preview=$("report-preview");
let allReports=[],filtered=[],page=1,selected=null,charts=[],activeSeries=[];
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
 const rows=activeSeries.filter(x=>x.parameter===parameter).sort((a,b)=>a.observed_on.localeCompare(b.observed_on));
 if(!rows.length)return;
 const card=document.createElement("div");card.className="chart-card";const h=document.createElement("h4");h.textContent=title;const area=document.createElement("div");area.className="chart-area";const canvas=document.createElement("canvas");area.append(canvas);card.append(h,area);$("report-charts").append(card);
 charts.push(new Chart(canvas,{type,data:{labels:rows.map(x=>dayText(x.observed_on)),datasets:[{label:title,data:rows.map(x=>Number(x.value)),borderColor:color,backgroundColor:color+"22",fill:type==="line",tension:.3,borderRadius:4,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:9},maxTicksLimit:7}},y:{grid:{color:"#edf0e8"},ticks:{font:{size:9}}}}}}));
}
async function openReport(r){
 selected=r;destroyCharts();$("summary-grid").replaceChildren();$("evidence-grid").replaceChildren();$("recommendation-grid").replaceChildren();$("limitations-list").replaceChildren();$("report-charts").replaceChildren();
 const result=r.result||{},field=result.field||{};
 $("preview-title").textContent=(field.name||fieldName(r))+" Analysis Report";
 $("preview-meta").textContent="Generated "+dateText(r.created_at)+" · Report ID "+r.id;
 addSummary("Field",field.name||fieldName(r));addSummary("Crop",field.crop||r.crop_code);addSummary("Analysis date",dateText(r.created_at));addSummary("Result",reportStatus(r));
 (result.evidence||[]).forEach(addEvidence);
 if(!(result.evidence||[]).length){const e=document.createElement("div");e.className="muted-note";e.textContent="No climate evidence was saved in this historical record."; $("evidence-grid").append(e)}
 activeSeries=Array.isArray(result.climate_series)?result.climate_series:[];let legacySeries=false;if(!activeSeries.length&&r.field_id){try{const end=new Date(r.created_at).toISOString().slice(0,10);const start=new Date(new Date(r.created_at).getTime()-14*86400000).toISOString().slice(0,10);const {data,error}=await db.from("climate_observations").select("parameter,observed_on,value,unit,source").eq("field_id",r.field_id).gte("observed_on",start).lte("observed_on",end).order("observed_on",{ascending:true});if(!error&&data?.length){activeSeries=data.map(x=>({...x,value:Number(x.value)}));legacySeries=true}}catch(e){console.warn("Legacy climate history unavailable",e)}}chartCard("Daily maximum temperature","T2M_MAX","#556d4a");chartCard("Daily rainfall","PRECTOTCORR","#a4ac86","bar");if(!activeSeries.some(x=>x.parameter==="PRECTOTCORR"))chartCard("Daily rainfall","IMERG_PRECTOT","#a4ac86","bar");chartCard("Relative humidity","RH2M","#a67c52");
 $("chart-note").textContent=activeSeries.length?(legacySeries?"Charts are reconstructed from saved climate observations dated on or before this analysis. They may not be an exact snapshot of what was displayed at generation time.":"Charts use the climate observations saved with this analysis. They are a historical snapshot and are not refreshed from current weather data."):"No daily climate observations are available for this report. Only the saved evidence values can be shown.";
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
async function downloadPdf(){
 if(!selected)return;
 const button=$("download-pdf");button.disabled=true;button.textContent="Preparing PDF…";
 try{
  if(!window.jspdf?.jsPDF||!window.html2canvas)throw new Error("PDF rendering libraries are unavailable");
  await Promise.all(charts.map(c=>new Promise(resolve=>{if(c.$rendered)resolve();else{c.options.animation=false;c.update("none");requestAnimationFrame(()=>requestAnimationFrame(resolve))}})));
  const node=preview;const canvas=await window.html2canvas(node,{scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false,scrollX:0,scrollY:-window.scrollY,windowWidth:Math.max(node.scrollWidth,900),onclone:doc=>{const p=doc.getElementById("report-preview");if(p){p.style.display="grid";p.style.width="1000px";p.style.maxWidth="none";p.style.boxShadow="none";p.style.border="0"}doc.querySelectorAll(".preview-actions").forEach(x=>x.style.display="none")}});
  const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
  const margin=8,pageWidth=210-margin*2,pageHeight=297-margin*2,imgHeight=canvas.height*pageWidth/canvas.width;
  const sliceHeight=Math.floor(pageHeight*canvas.width/pageWidth);
  let offset=0,page=0;
  while(offset<canvas.height){
   const partHeight=Math.min(sliceHeight,canvas.height-offset),part=document.createElement("canvas");part.width=canvas.width;part.height=partHeight;
   part.getContext("2d").drawImage(canvas,0,offset,canvas.width,partHeight,0,0,canvas.width,partHeight);
   const image=part.toDataURL("image/jpeg",0.94);if(page>0)doc.addPage();const renderedHeight=partHeight*pageWidth/canvas.width;
   doc.addImage(image,"JPEG",margin,margin,pageWidth,renderedHeight,undefined,"FAST");offset+=partHeight;page++;
  }
  const field=selected.result?.field||{},safe=(field.name||"field").replace(/[^a-z0-9-_]+/gi,"-").toLowerCase();doc.save("NILORA-"+safe+"-"+new Date(selected.created_at).toISOString().slice(0,10)+".pdf");
 }catch(e){console.error("Visual PDF export failed:",e);showToast("Could not render the report PDF. Please try again or use your browser's Print option.");}
 finally{button.disabled=false;button.innerHTML='<iconify-icon icon="solar:download-linear"></iconify-icon> Download PDF'}
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