const $=id=>document.getElementById(id);let adminKey="";
function escapeHtml(text){return String(text??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
async function api(url,options={}){
  const res=await fetch(url,{...options,headers:{"Content-Type":"application/json","x-admin-key":adminKey,...(options.headers||{})}});
  const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||"Ocurrió un error.");return data;
}
$("connectBtn").addEventListener("click",connect);$("adminKey").addEventListener("keydown",e=>{if(e.key==="Enter")connect()});
async function connect(){
  adminKey=$("adminKey").value;$("adminFeedback").textContent="Comprobando…";
  try{await loadPending();await loadReported();$("adminWorkspace").classList.remove("hidden");$("adminFeedback").textContent="Acceso correcto.";$("adminFeedback").className="form-feedback good"}
  catch(err){$("adminWorkspace").classList.add("hidden");$("adminFeedback").textContent=err.message;$("adminFeedback").className="form-feedback bad"}
}
async function loadPending(){
  const data=await api("/api/admin/pending");$("pendingCount").textContent=data.items.length;
  $("pendingList").innerHTML=data.items.length?data.items.map(item=>`
    <article class="review-card">
      <span class="eyebrow">${escapeHtml(item.subject)} · ${escapeHtml(item.level)}</span>
      <h2>${escapeHtml(item.title)}</h2>
      <div class="review-meta">${escapeHtml(item.author_alias)}${item.topic?` · ${escapeHtml(item.topic)}`:""}</div>
      <div class="review-content">${escapeHtml(item.content)}</div>
      ${item.sources?`<div class="review-sources"><strong>Fuentes:</strong><br>${escapeHtml(item.sources)}</div>`:""}
      <div class="review-actions"><button class="approve-btn" data-action="approve" data-id="${item.id}">✓ Aprobar</button><button class="reject-btn" data-action="reject" data-id="${item.id}">✕ Rechazar</button></div>
    </article>`).join(""):`<div class="empty-state"><div>✓</div><h3>No hay pendientes</h3><p>La bandeja está al día.</p></div>`;
}
async function loadReported(){
  const data=await api("/api/admin/reported");$("reportedCount").textContent=data.items.length;
  $("reportedList").innerHTML=data.items.length?data.items.map(item=>`
    <article class="review-card">
      <span class="eyebrow">${escapeHtml(item.subject)} · ${escapeHtml(item.level)}</span>
      <h2>${escapeHtml(item.title)}</h2><div class="review-meta">${escapeHtml(item.author_alias)} · ${item.reports} reporte${item.reports===1?"":"s"}</div>
      <div class="report-reasons">${(item.reasons||[]).map(reason=>`• ${escapeHtml(reason)}`).join("<br>")}</div>
      <div class="review-actions"><button class="remove-btn" data-action="remove" data-id="${item.id}">Eliminar publicación</button></div>
    </article>`).join(""):`<div class="empty-state"><div>✓</div><h3>Sin reportes</h3><p>No hay publicaciones reportadas.</p></div>`;
}
$("adminWorkspace").addEventListener("click",async event=>{
  const tab=event.target.closest("[data-tab]");
  if(tab){document.querySelectorAll(".admin-tab").forEach(b=>b.classList.toggle("active",b===tab));$("pendingPanel").classList.toggle("hidden",tab.dataset.tab!=="pending");$("reportedPanel").classList.toggle("hidden",tab.dataset.tab!=="reported");return}
  const btn=event.target.closest("[data-action]");if(!btn)return;
  btn.disabled=true;
  try{await api(`/api/admin/${btn.dataset.id}/${btn.dataset.action}`,{method:"POST",body:"{}"});await loadPending();await loadReported()}
  catch(err){alert(err.message);btn.disabled=false}
});
