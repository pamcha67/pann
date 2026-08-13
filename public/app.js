const $=id=>document.getElementById(id);
const grid=$("summaryGrid"), emptyState=$("emptyState"), libraryStatus=$("libraryStatus");
const searchInput=$("searchInput"), subjectFilter=$("subjectFilter"), levelFilter=$("levelFilter"), sortFilter=$("sortFilter");
const summaryDialog=$("summaryDialog"), reportDialog=$("reportDialog"), publishForm=$("publishForm");
const contentInput=$("contentInput"), charCount=$("charCount"), formFeedback=$("formFeedback"), reportFeedback=$("reportFeedback");
let currentSummaryId=null;

function escapeHtml(text){return String(text??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function formatDate(value){return new Intl.DateTimeFormat("es-CL",{day:"numeric",month:"short",year:"numeric"}).format(new Date(value))}
function excerpt(text,max=280){const clean=String(text||"").replace(/\s+/g," ").trim();return clean.length>max?clean.slice(0,max).trim()+"…":clean}
async function api(url,options={}){
  const response=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||"Ocurrió un error.");
  return data;
}

async function loadSummaries(){
  libraryStatus.textContent="Buscando…";
  const params=new URLSearchParams({
    q:searchInput.value.trim(),subject:subjectFilter.value,level:levelFilter.value,
    sort:sortFilter.value==="oldest"?"oldest":"newest"
  });
  try{
    const data=await api(`/api/summaries?${params}`);
    renderSummaries(data.items);
    libraryStatus.textContent=`${data.items.length} resumen${data.items.length===1?"":"es"}`;
  }catch(err){
    grid.innerHTML="";
    emptyState.classList.remove("hidden");
    emptyState.querySelector("h3").textContent="Biblioteca temporalmente no disponible";
    emptyState.querySelector("p").textContent=err.message;
    libraryStatus.textContent="Sin conexión a la base";
  }
}

function renderSummaries(items){
  emptyState.classList.toggle("hidden",items.length>0);
  grid.innerHTML=items.map(item=>`
    <article class="summary-card">
      <div class="card-meta"><span class="tag">${escapeHtml(item.subject)}</span><span class="tag">${escapeHtml(item.level)}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      ${item.topic?`<div class="topic">${escapeHtml(item.topic)}</div>`:""}
      <p class="excerpt">${escapeHtml(excerpt(item.content))}</p>
      <div class="card-footer">
        <small>${escapeHtml(item.author_alias)} · ${formatDate(item.approved_at||item.created_at)}</small>
        <button class="open-btn" data-open="${item.id}">Leer →</button>
      </div>
    </article>`).join("");
}

grid.addEventListener("click",async event=>{
  const btn=event.target.closest("[data-open]"); if(btn) await openSummary(btn.dataset.open);
});

async function openSummary(id){
  try{
    const data=await api(`/api/summaries/${id}`), item=data.item;
    currentSummaryId=item.id;
    $("dialogContent").innerHTML=`
      <div class="card-meta"><span class="tag">${escapeHtml(item.subject)}</span><span class="tag">${escapeHtml(item.level)}</span></div>
      <h2 class="dialog-title">${escapeHtml(item.title)}</h2>
      <div class="dialog-meta">${item.topic?`${escapeHtml(item.topic)} · `:""}por ${escapeHtml(item.author_alias)} · ${formatDate(item.approved_at||item.created_at)} · ${Number(item.views||0)} vistas</div>
      <div class="dialog-body">${escapeHtml(item.content)}</div>
      ${item.sources?`<div class="dialog-sources"><strong>Fuentes o referencias</strong><br>${escapeHtml(item.sources)}</div>`:""}
      <div class="dialog-actions">
        <button class="small-btn" id="copyBtn">⧉ Copiar texto</button>
        <button class="small-btn" id="downloadBtn">↓ Descargar .txt</button>
        <button class="small-btn" id="shareBtn">↗ Compartir</button>
        <button class="small-btn" id="reportBtn">⚑ Reportar</button>
      </div>`;
    summaryDialog.showModal();

    $("copyBtn").onclick=async()=>{await navigator.clipboard.writeText(item.content);$("copyBtn").textContent="✓ Copiado"};
    $("downloadBtn").onclick=()=>{
      const text=`${item.title}\n\n${item.content}\n\n${item.sources?"Fuentes:\n"+item.sources+"\n\n":""}Compartido en Resumenoteca.`;
      const blob=new Blob([text],{type:"text/plain;charset=utf-8"}), url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url;a.download=`${item.title.replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"")||"resumen"}.txt`;a.click();URL.revokeObjectURL(url);
    };
    $("shareBtn").onclick=async()=>{
      const url=new URL(location.href);url.search="";url.searchParams.set("id",item.id);
      if(navigator.share){await navigator.share({title:item.title,url:url.toString()}).catch(()=>{})}
      else{await navigator.clipboard.writeText(url.toString());$("shareBtn").textContent="✓ Enlace copiado"}
    };
    $("reportBtn").onclick=()=>{summaryDialog.close();reportFeedback.textContent="";$("reportReason").value="";reportDialog.showModal()};
  }catch(err){alert(err.message)}
}

$("dialogClose").addEventListener("click",()=>summaryDialog.close());
$("reportClose").addEventListener("click",()=>reportDialog.close());

$("reportForm").addEventListener("submit",async event=>{
  event.preventDefault(); if(!currentSummaryId)return;
  reportFeedback.textContent="Enviando…";
  try{
    await api(`/api/summaries/${currentSummaryId}/report`,{method:"POST",body:JSON.stringify({reason:$("reportReason").value})});
    reportFeedback.textContent="Gracias. El reporte fue enviado para revisión.";reportFeedback.className="form-feedback good";
    setTimeout(()=>reportDialog.close(),900);
  }catch(err){reportFeedback.textContent=err.message;reportFeedback.className="form-feedback bad"}
});

function doSearch(){loadSummaries();document.getElementById("library").scrollIntoView({behavior:"smooth",block:"start"})}
$("searchBtn").addEventListener("click",doSearch);
searchInput.addEventListener("keydown",event=>{if(event.key==="Enter")doSearch()});
[subjectFilter,levelFilter,sortFilter].forEach(el=>el.addEventListener("change",loadSummaries));
document.querySelectorAll("[data-scroll]").forEach(btn=>btn.addEventListener("click",()=>document.getElementById(btn.dataset.scroll).scrollIntoView({behavior:"smooth"})));

contentInput.addEventListener("input",()=>{charCount.textContent=contentInput.value.length.toLocaleString("es-CL")});
$("textFileInput").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>12000){formFeedback.textContent="El archivo es demasiado largo. Puedes copiar solo la parte que quieras compartir.";formFeedback.className="form-feedback bad";event.target.value="";return}
  contentInput.value=await file.text();contentInput.dispatchEvent(new Event("input"));event.target.value="";
});

publishForm.addEventListener("submit",async event=>{
  event.preventDefault();formFeedback.textContent="Enviando a revisión…";formFeedback.className="form-feedback";
  const payload={
    title:$("titleInput").value,subject:$("subjectInput").value,level:$("levelInput").value,
    topic:$("topicInput").value,authorAlias:$("aliasInput").value,content:contentInput.value,
    sources:$("sourcesInput").value,acceptedRules:$("rulesInput").checked
  };
  try{
    const data=await api("/api/summaries",{method:"POST",body:JSON.stringify(payload)});
    formFeedback.textContent=data.message;formFeedback.className="form-feedback good";
    publishForm.reset();contentInput.dispatchEvent(new Event("input"));
  }catch(err){formFeedback.textContent=err.message;formFeedback.className="form-feedback bad"}
});

const initialId=new URLSearchParams(location.search).get("id");
loadSummaries().then(()=>{if(initialId&&/^[0-9a-f-]{36}$/i.test(initialId))openSummary(initialId)});
