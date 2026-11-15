(()=> {
  const $ = id => document.getElementById(id);
  const select = $("field-select"), run = $("run-analysis");
  const stateText = $("analysis-state-text"), empty = $("live-empty");
  const cards = $("live-cards"), evidence = $("live-evidence"), limitations = $("live-limitations");
  const esc = value => String(value ?? "");
  const setState = message => { if (stateText) stateText.textContent = message; };
  const node = (tag, className, value) => { const el=document.createElement(tag); if(className)el.className=className; if(value!==undefined)el.textContent=esc(value); return el; };
  let user = null, fields = [];

  function renderResult(result) {
    cards.replaceChildren(); evidence.replaceChildren(); limitations.replaceChildren();
    empty.textContent = result.status === "insufficient_data"
      ? "لسه البيانات المناخية غير كافية لإصدار تنبيه موثوق. راجع التفاصيل أدناه."
      : "تم إنشاء التحليل وحفظه في سجل المزرعة.";
    for (const item of result.recommendations || []) {
      const card=node("article","live-card");
      card.append(node("span","live-tag "+(item.priority==="watch"?"watch":""),item.priority==="watch"?"يحتاج متابعة":"إرشاد"));
      card.append(node("h3","",item.title));
      card.append(node("p","",item.reason));
      card.append(node("div","live-action","الإجراء المقترح: "+item.action));
      cards.append(card);
    }
    for (const item of result.evidence || []) {
      const chip=node("div","evidence-chip");
      chip.append(node("span","",item.label));
      chip.append(node("b","",Number(item.value).toFixed(1)+" "+item.unit));
      evidence.append(chip);
    }
    evidence.hidden = !(result.evidence || []).length;
    if ((result.limitations || []).length) {
      const title=node("b","", "حدود التحليل");
      const list=node("ul","");
      for(const line of result.limitations)list.append(node("li","",line));
      limitations.append(title,list);limitations.hidden=false;
    } else limitations.hidden=true;
    setState(result.status==="ready_for_review"?"Analysis saved · review suggested":"Insufficient data · no agronomic prescription");
  }

  async function loadHistory() {
    const {data,error}=await db.from("crop_assessments").select("id,status,created_at,result").order("created_at",{ascending:false}).limit(5);
    if(error)throw error;
    const list=$("history-list"), historyEmpty=$("history-empty");
    list.replaceChildren();
    historyEmpty.hidden=(data||[]).length>0;
    for(const item of data||[]){
      const row=node("div","history-item");
      const left=node("span","",item.result?.field?.name||"Field assessment");
      const right=node("b","",new Date(item.created_at).toLocaleString()+" · "+(item.status==="ready_for_review"?"Ready for review":"Insufficient data"));
      row.append(left,right);list.append(row);
    }
  }

  async function initialize() {
    try {
      const {data:{user:authUser},error:authError}=await db.auth.getUser();
      if(authError||!authUser){location.replace("signup.html");return;}
      user=authUser;
      const {data,error}=await db.from("fields")
        .select("id,name,current_crop,farm_id,farms!inner(name,owner_id)")
        .eq("farms.owner_id",user.id).order("created_at",{ascending:false});
      if(error)throw error;
      fields=data||[];
      select.replaceChildren();
      if(!fields.length){select.append(node("option","","No fields found — complete your farm profile first"));run.disabled=true;setState("No field registered yet");return;}
      select.append(node("option","","Choose a field…"));
      for(const field of fields){
        const option=node("option","",field.name+" · "+(field.current_crop||"Crop not set"));
        option.value=field.id;select.append(option);
      }
      run.disabled=false;
      setState("Field ready · waiting for analysis");
      await loadHistory();
    } catch(error) {
      console.error("Recommendations initialization:",error);
      select.replaceChildren(node("option","","Could not load your fields"));
      setState("Could not load field data: "+(error.message||"Unknown error"));
    }
  }

  run.addEventListener("click",async()=>{
    const fieldId=select.value;
    if(!fieldId){setState("Choose a field first");return;}
    run.disabled=true;run.textContent="Collecting data and analyzing…";cards.replaceChildren();evidence.replaceChildren();limitations.hidden=true;
    empty.textContent="جاري جلب أحدث البيانات المناخية ثم تحليلها. قد يستغرق ذلك بعض الوقت…";
    try {
      let nasaMessage="NASA POWER data unavailable";
      const nasa=await db.functions.invoke("nasa-power",{body:{field_id:fieldId}});
      if(nasa.error) nasaMessage=nasa.error.message||"NASA POWER request failed";
      else nasaMessage="NASA POWER observations fetched: "+(nasa.data?.stored_count??0)+" new rows";
      const analysis=await db.functions.invoke("farm-recommendations",{body:{field_id:fieldId}});
      if(analysis.error)throw new Error(analysis.data?.error||analysis.error.message||"Analysis failed");
      if(analysis.data?.error)throw new Error(analysis.data.error);
      renderResult(analysis.data);
      setState((analysis.data.status==="ready_for_review"?"Analysis saved · ":"Insufficient data · ")+nasaMessage);
      await loadHistory();
    } catch(error) {
      console.error("NILORA analysis failed:",error);
      empty.textContent="تعذر إكمال التحليل: "+(error.message||"خطأ غير معروف")+". راجع تسجيل الدخول وبيانات الحقل وحاول مرة أخرى.";
      setState("Analysis failed");
    } finally {
      run.disabled=false;run.innerHTML='<iconify-icon icon="solar:refresh-linear"></iconify-icon> Analyze my field';
    }
  });
  initialize();
})();