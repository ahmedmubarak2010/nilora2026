(()=> {
  const $ = id => document.getElementById(id);
  const select=$("field-select"),run=$("run-analysis"),stateText=$("analysis-state-text");
  const empty=$("live-empty"),cards=$("live-cards"),evidence=$("live-evidence"),limitations=$("live-limitations");
  const node=(tag,className,value)=>{const el=document.createElement(tag);if(className)el.className=className;if(value!==undefined)el.textContent=String(value??"");return el;};
  let user=null,fields=[],charts={};

  const copy={
    heat_monitoring:{tag:"Field monitoring",title:"Monitor heat stress conditions",reason:"NASA POWER recorded a peak daily maximum temperature of {peak}°C during the available period. This is a screening signal, not proof of crop stress.",action:"Inspect the field early in the day. Check leaf condition, soil moisture, and irrigation equipment before changing irrigation timing or volume.",benefit:"Consistent scouting can help identify visible heat stress earlier and prompt timely field checks. It cannot guarantee yield protection."},
    rainfall_inspection:{tag:"Field monitoring",title:"Inspect drainage after rainfall",reason:"The highest recent daily precipitation estimate was {rain} mm/day in the last 7 days.",action:"Check low spots, drains, and areas where water may collect. Record any waterlogging and confirm conditions on the ground.",benefit:"Checking drainage after rainfall may help identify standing water and waterlogging risks sooner. It does not guarantee prevention of root damage."},
    humidity_scouting:{tag:"Field monitoring",title:"Scout for possible fungal symptoms",reason:"Average relative humidity across the latest available observations was {humidity}%. Humidity alone does not confirm a disease.",action:"Inspect leaves and dense canopy areas for spots, mould, or unusual changes. Photograph symptoms and consult an agricultural engineer before treatment.",benefit:"Regular scouting may help detect symptoms earlier. It cannot diagnose disease or justify pesticide use without confirmation."},
    routine_scouting:{tag:"Routine guidance",title:"Continue routine field scouting",reason:"The available climate observations did not trigger the current preliminary alert rules. No alert does not mean the crop is problem-free.",action:"Continue regular crop inspections and monitor soil moisture and irrigation performance. Record changes and investigate unusual symptoms.",benefit:"Routine monitoring supports earlier awareness of changing field conditions and more informed follow-up decisions. It does not guarantee a higher yield."},
    insufficient_climate_data:{tag:"Data required",title:"More climate data is needed",reason:"There are not enough distinct observation days to run the preliminary screening rules reliably.",action:"Check the farm location and field profile, then run the analysis again when more observations are available. Do not make agronomic changes based on incomplete data.",benefit:"Improving data coverage can make future screening more useful. No crop outcome can be estimated from the current evidence."}
  };
  function setState(message){if(stateText)stateText.textContent=message;}
  function formatDate(value){return new Date(value+"T00:00:00").toLocaleDateString("en",{month:"short",day:"numeric"});}
  function clearCharts(){Object.values(charts).forEach(chart=>chart.destroy());charts={};}
  function showChartEmpty(wrapId,message){const wrap=$(wrapId);if(!wrap)return;wrap.replaceChildren(node("div","chart-empty",message));}
  function makeLine(canvasId,labels,values,label,color,yTitle){
    const canvas=$(canvasId);if(!canvas||!window.Chart||!labels.length)return;
    charts[canvasId]=new Chart(canvas,{type:"line",data:{labels,datasets:[{label,data:values,borderColor:color,backgroundColor:color+"22",fill:true,tension:.3,spanGaps:false,pointRadius:3,pointHoverRadius:5,borderWidth:2.5}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:"#2f3d28",padding:10}},scales:{x:{grid:{display:false},ticks:{font:{size:9},color:"#687064",maxTicksLimit:7}},y:{beginAtZero:false,title:{display:true,text:yTitle,font:{size:9}},grid:{color:"#edf0e8"},ticks:{font:{size:9},color:"#687064"}}}}});
  }
  function makeRain(canvasId,labels,values){
    const canvas=$(canvasId);if(!canvas||!window.Chart||!labels.length)return;
    charts[canvasId]=new Chart(canvas,{type:"bar",data:{labels,datasets:[{label:"Rainfall (mm/day)",data:values,backgroundColor:"#a4ac86",borderRadius:5,maxBarThickness:24}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"#2f3d28",padding:10}},scales:{x:{grid:{display:false},ticks:{font:{size:9},color:"#687064",maxTicksLimit:7}},y:{beginAtZero:true,title:{display:true,text:"mm/day",font:{size:9}},grid:{color:"#edf0e8"},ticks:{font:{size:9},color:"#687064"}}}}});
  }
  async function loadClimateCharts(fieldId){
    clearCharts();
    const since=new Date(Date.now()-14*86400000).toISOString().slice(0,10);
    const {data,error}=await db.from("climate_observations").select("parameter,observed_on,value,unit,source").eq("field_id",fieldId).gte("observed_on",since).in("parameter",["T2M_MAX","PRECTOTCORR","IMERG_PRECTOT","RH2M"]).order("observed_on",{ascending:true}).limit(500);
    if(error)throw error;
    const rows=data||[],dates=[...new Set(rows.map(r=>r.observed_on))].sort();
    $("chart-period").textContent=dates.length?dates.length+" observation days · Last 14 days":"No saved observations";
    const param=(key)=>rows.filter(r=>r.parameter===key);
    const temp=param("T2M_MAX"),rain=param("PRECTOTCORR").length?param("PRECTOTCORR"):param("IMERG_PRECTOT"),humidity=param("RH2M");
    const series=(arr)=>dates.map(date=>{const match=arr.find(r=>r.observed_on===date);return match?Number(match.value):null;});
    const labels=dates.map(formatDate);
    if(temp.length)makeLine("temperature-chart",labels,series(temp),"Daily maximum temperature","#556d4a","°C");else showChartEmpty("temperature-chart-wrap","No temperature observations are saved for this field yet.");
    if(rain.length)makeRain("rainfall-chart",labels,series(rain));else showChartEmpty("rainfall-chart-wrap","No precipitation observations are saved for this field yet.");
    if(humidity.length)makeLine("humidity-chart",labels,series(humidity),"Relative humidity","#a67c52","%");else showChartEmpty("humidity-chart-wrap","No humidity observations are saved for this field yet.");
    const coverage=$("coverage-chart");
    const counts=[temp.length,rain.length,humidity.length];
    if(window.Chart&&coverage&&counts.some(Boolean)){
      charts.coverage=new Chart(coverage,{type:"doughnut",data:{labels:["Temperature","Rainfall","Humidity"],datasets:[{data:counts,backgroundColor:["#556d4a","#c8d5b5","#a67c52"],borderColor:"#fff",borderWidth:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:"62%",plugins:{legend:{position:"bottom",labels:{usePointStyle:true,boxWidth:8,font:{size:10}}},tooltip:{backgroundColor:"#2f3d28",padding:10}}}});
    }else showChartEmpty("coverage-chart-wrap","No climate parameters are available to summarize yet.");
  }
  function renderResult(result){
    cards.replaceChildren();evidence.replaceChildren();limitations.replaceChildren();
    empty.textContent=result.status==="insufficient_data"?"Climate data is not sufficient for reliable screening. Review the details below.":"Analysis completed and saved to your farm history.";
    const vals={};
    for(const item of result.evidence||[]){
      if(item.metric==="T2M_MAX")vals.peak=item.value;
      if(String(item.metric).includes("PRECTOT")||item.label==="Recent daily precipitation")vals.rain=item.value;
      if(item.metric==="RH2M")vals.humidity=item.value;
      const chip=node("div","evidence-chip");chip.append(node("span","",item.label));chip.append(node("b","",Number(item.value).toFixed(1)+" "+item.unit));evidence.append(chip);
    }
    evidence.hidden=!(result.evidence||[]).length;
    for(const item of result.recommendations||[]){
      const text=copy[item.code]||copy.routine_scouting;
      const card=node("article","live-card");
      card.append(node("span","live-tag "+(item.priority==="watch"?"watch":""),text.tag));
      card.append(node("h3","",text.title));
      card.append(node("p","",text.reason.replace("{peak}",vals.peak??"—").replace("{rain}",vals.rain??"—").replace("{humidity}",vals.humidity??"—")));
      card.append(node("div","live-action","Recommended action: "+text.action));
      cards.append(card);
      $("action-benefit").textContent="Potential outcome: "+text.benefit;
    }
    if(!(result.recommendations||[]).length)$("action-benefit").textContent="Potential benefit: better field awareness through consistent monitoring. No yield or quality improvement can be guaranteed.";
    if((result.limitations||[]).length){limitations.append(node("b","","Analysis limitations"));const list=node("ul","");for(const line of result.limitations)list.append(node("li","",line));limitations.append(list);limitations.hidden=false;}else limitations.hidden=true;
    const crop=result.field?.crop||"your crop";
    $("crop-outcome-title").textContent="Expected outcome for "+crop;
    $("crop-outcome-copy").textContent="A reliable yield or quality forecast is not available from climate observations alone. Add crop variety, planting date, growth stage, field boundary, soil data, irrigation records, and historical yield data before estimating harvest outcomes.";
    setState(result.status==="ready_for_review"?"Analysis saved · field review recommended":"Insufficient data · no agronomic prescription");
  }
  async function loadHistory(){
    const {data,error}=await db.from("crop_assessments").select("id,status,created_at,result").order("created_at",{ascending:false}).limit(5);
    if(error)throw error;
    const list=$("history-list"),historyEmpty=$("history-empty");list.replaceChildren();historyEmpty.hidden=(data||[]).length>0;
    for(const item of data||[]){const row=node("div","history-item");row.append(node("span","",item.result?.field?.name||"Field assessment"));row.append(node("b","",new Date(item.created_at).toLocaleString("en")+" · "+(item.status==="ready_for_review"?"Ready for review":"Insufficient data")));list.append(row);}
  }
  async function initialize(){
    try{
      const {data:{user:authUser},error:authError}=await db.auth.getUser();
      if(authError||!authUser){location.replace("signup.html");return;}user=authUser;
      const {data,error}=await db.from("fields").select("id,name,current_crop,farm_id,farms!inner(name,owner_id)").eq("farms.owner_id",user.id).order("created_at",{ascending:false});
      if(error)throw error;fields=data||[];select.replaceChildren();
      if(!fields.length){select.append(node("option","","No fields found — complete your farm profile first"));run.disabled=true;setState("No field registered yet");return;}
      select.append(node("option","","Choose a field…"));
      for(const field of fields){const option=node("option","",field.name+" · "+(field.current_crop||"Crop not set"));option.value=field.id;select.append(option);}
      run.disabled=false;setState("Field ready · waiting for analysis");await loadHistory();
    }catch(error){console.error("Recommendations initialization:",error);select.replaceChildren(node("option","","Could not load your fields"));setState("Unable to load field data. Check your connection and sign-in.");}
  }
  run.addEventListener("click",async()=>{
    const fieldId=select.value;if(!fieldId){setState("Choose a field first");return;}
    run.disabled=true;run.textContent="Collecting data and analyzing…";cards.replaceChildren();evidence.replaceChildren();limitations.hidden=true;empty.textContent="Fetching the latest climate observations and preparing your analysis…";
    try{
      const nasa=await db.functions.invoke("nasa-power",{body:{field_id:fieldId}});
      const nasaMessage=nasa.error?"NASA POWER update unavailable":"NASA POWER update completed · "+(nasa.data?.stored_count??0)+" new observations";
      const analysis=await db.functions.invoke("farm-recommendations",{body:{field_id:fieldId}});
      if(analysis.error||analysis.data?.error)throw new Error("The analysis service could not complete the request. Please check the field location and try again.");
      renderResult(analysis.data);
      setState((analysis.data.status==="ready_for_review"?"Analysis saved · ":"Insufficient data · ")+nasaMessage);
      await Promise.all([loadHistory(),loadClimateCharts(fieldId)]);
    }catch(error){console.error("NILORA analysis failed:",error);empty.textContent=error.message||"Analysis failed. Please try again.";setState("Analysis failed");}
    finally{run.disabled=false;run.innerHTML='<iconify-icon icon="solar:refresh-linear"></iconify-icon> Analyze my field';}
  });
  select.addEventListener("change",()=>{clearCharts();["temperature-chart-wrap","rainfall-chart-wrap","humidity-chart-wrap","coverage-chart-wrap"].forEach(id=>showChartEmpty(id,"Run an analysis to load saved observations for this field."));$("chart-period").textContent="Waiting for analysis";});
  initialize();
})();