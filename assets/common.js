/* =======================================================================
   RESOLVEDESK — shared utilities, API helper, and complaint view/update
   modals used by BOTH dashboard.html (admin) and employee.html.
   Loaded before the page-specific script on every authenticated page.
   ======================================================================= */

const API = "api"; // relative path to the api/ folder

const STATUS_ORDER = ["Pending","Assigned","In Progress","Completed","Closed"];
const STATUS_BADGE = {
  "Pending":"b-pending","Assigned":"b-assigned","In Progress":"b-progress",
  "Completed":"b-completed","Closed":"b-closed","Rejected":"b-rejected"
};
const CATEGORIES = ["Water Supply","Electricity","Road & Infrastructure","Sanitation","Noise Pollution","Public Property Damage","Street Lighting","Other"];
const DEPARTMENTS = ["Public Works","Electrical","Water Board","Sanitation","Administration"];

let currentUser = null; // { id, username, role, employee_id, display_name }
let pendingFiles = { reg: [], before: [], after: [] };
let cache = { employees: [], complaints: [] };

/* ---------------- generic API helper ---------------- */
async function api(endpoint, { method = "GET", params = null, form = null } = {}) {
  let url = `${API}/${endpoint}`;
  const opts = { method, credentials: "include" };
  if (method === "GET" && params) {
    url += "?" + new URLSearchParams(params).toString();
  } else if (form) {
    opts.body = form; // FormData — browser sets multipart headers automatically
  } else if (params) {
    opts.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    opts.body = new URLSearchParams(params).toString();
  }
  let res, data;
  try {
    res = await fetch(url, opts);
    data = await res.json();
  } catch (err) {
    showToast("Network error — check your API/database connection.", "error");
    throw err;
  }
  if (!data.success) {
    showToast(data.message || "Something went wrong.", "error");
    throw new Error(data.message || "API error");
  }
  return data;
}

/* ---------------- utils ---------------- */
function fmtDate(d){ if(!d) return "—"; const dt = new Date(d); return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtDateTime(d){ if(!d) return "—"; const dt = new Date(d); return dt.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function empName(id, list){ const e = (list||cache.employees).find(x=>String(x.id)===String(id)); return e ? e.name : "Unassigned"; }
function escapeHtml(s){ return (s==null?"":String(s)).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fileUrl(path){ return path; } // uploads/... paths are already relative to project root

function showToast(msg, type="success"){
  const icon = type==="success" ? "fa-circle-check" : type==="error" ? "fa-circle-exclamation" : "fa-circle-info";
  const bg = type==="success" ? "#1aa260" : type==="error" ? "#d5342c" : "#2f6fed";
  const el = document.createElement("div");
  el.className = "toast align-items-center border-0 show mb-2";
  el.style.background = "#fff";
  el.style.borderLeft = `4px solid ${bg}`;
  el.style.boxShadow = "0 6px 20px rgba(30,37,48,.12)";
  el.innerHTML = `<div class="d-flex">
      <div class="toast-body fw-semibold" style="color:${bg}"><i class="fa-solid ${icon} me-2"></i>${escapeHtml(msg)}</div>
      <button type="button" class="btn-close me-2 m-auto" onclick="this.closest('.toast').remove()"></button>
    </div>`;
  document.getElementById("toastHost").appendChild(el);
  setTimeout(()=>el.remove(), 4200);
}

function setBusy(on){
  const app = document.getElementById("app");
  if(!app) return;
  app.style.opacity = on ? .55 : 1;
  app.style.pointerEvents = on ? "none" : "auto";
}

function buildStepper(status){
  const idx = STATUS_ORDER.indexOf(status);
  const icons = ["fa-file-circle-plus","fa-user-check","fa-screwdriver-wrench","fa-clipboard-check","fa-box-archive"];
  return `<div class="stepper">
    ${STATUS_ORDER.map((s,i)=>{
      let cls = i < idx ? "done" : i===idx ? "current" : "";
      return `<div class="step ${cls}">
        <div class="dot"><i class="fa-solid ${icons[i]}"></i></div>
        <div class="step-label">${s}</div>
      </div>`;
    }).join("")}
  </div>`;
}

function renderFileChips(containerId, files, tag){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(!files.length){ el.innerHTML = ""; return; }
  el.innerHTML = files.map((f,i)=>`<span class="file-chip"><i class="fa-solid fa-paperclip"></i>${escapeHtml(f.name)} <i class="fa-solid fa-xmark remove" onclick="removeFile('${tag}',${i},'${containerId}')"></i></span>`).join("");
}
function removeFile(tag, idx, containerId){
  pendingFiles[tag].splice(idx,1);
  renderFileChips(containerId, pendingFiles[tag], tag);
}

/* =======================================================================
   AUTH GUARD — used by dashboard.html / employee.html on load.
   Redirects to login.html if not signed in as the required role.
   ======================================================================= */
async function requireRole(role){
  setBusy(true);
  try{
    const res = await api("auth.php", { params:{action:"me"} });
    currentUser = res.user;
  } catch(_) { currentUser = null; }
  finally { setBusy(false); }

  if(!currentUser || currentUser.role !== role){
    window.location.href = "login.html";
    return false;
  }
  return true;
}

async function logout(){
  try{ await api("auth.php", { method:"POST", params:{action:"logout"} }); } catch(_){}
  currentUser = null;
  window.location.href = "login.html";
}

/* =======================================================================
   COMPLAINT MODALS — View / Update (shared markup + logic).
   Assign is admin-only and lives in dashboard.js.
   Each page must define window.refreshView() to reload its own list
   after a successful update.
   ======================================================================= */
function complaintModalsHTML(){
  return `
  <!-- VIEW MODAL -->
  <div class="modal fade" id="viewModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content"><div class="modal-body p-0" id="viewModalBody">
        <div class="empty-state"><i class="fa-solid fa-spinner fa-spin d-block"></i>Loading…</div>
      </div></div>
    </div>
  </div>

  <!-- UPDATE MODAL -->
  <div class="modal fade" id="updateModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Update Complaint <span class="mono text-muted" id="upd_id_label"></span></h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body" id="updateModalBody"></div>
        <div class="modal-footer">
          <button class="btn btn-light border" data-bs-dismiss="modal">Cancel</button>
          <button class="btn btn-brand" onclick="saveUpdate()">Update Complaint</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ASSIGN MODAL (admin only — markup always present, only opened from dashboard.js) -->
  <div class="modal fade" id="assignModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Assign Complaint <span class="mono text-muted" id="assign_id_label"></span></h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body" id="assignModalBody"></div>
        <div class="modal-footer">
          <button class="btn btn-light border" data-bs-dismiss="modal">Cancel</button>
          <button class="btn btn-brand" onclick="saveAssign()">Assign</button>
        </div>
      </div>
    </div>
  </div>`;
}

async function openViewModal(id){
  const modal = new bootstrap.Modal(document.getElementById("viewModal"));
  modal.show();
  let c;
  try{
    const res = await api("complaints.php", { params:{action:"get", id} });
    c = res.complaint;
  } catch(_) { modal.hide(); return; }

  const photoChips = (arr) => arr.map(f=>`<a href="${fileUrl(f.file_path)}" target="_blank" class="file-chip text-decoration-none"><i class="fa-solid fa-image"></i>${escapeHtml(f.file_name)}</a>`).join("");

  document.getElementById("viewModalBody").innerHTML = `
    <div class="p-4 pb-0 d-flex justify-content-between align-items-start flex-wrap gap-2">
      <div>
        <div class="text-muted small mono">Complaint ID #${c.id}</div>
        <h5 class="mb-0">${escapeHtml(c.subject)}</h5>
      </div>
      <span class="badge-status ${STATUS_BADGE[c.status]}">${c.status}</span>
    </div>
    <div class="px-4">${buildStepper(c.status)}</div>
    <div class="px-4 pb-4">
      <div class="row g-3 small">
        <div class="col-md-6"><div class="text-muted">Name</div><div class="fw-semibold">${escapeHtml(c.name)}</div></div>
        <div class="col-md-6"><div class="text-muted">Mobile</div><div class="fw-semibold mono">${c.mobile}</div></div>
        <div class="col-md-6"><div class="text-muted">Date Raised</div><div class="fw-semibold">${fmtDate(c.complaint_date)}</div></div>
        <div class="col-md-6"><div class="text-muted">Category</div><div class="fw-semibold">${c.category}</div></div>
        <div class="col-md-6"><div class="text-muted">Assigned Employee</div><div class="fw-semibold">${c.employee_name || "Unassigned"}</div></div>
        <div class="col-md-6"><div class="text-muted">Priority</div><div class="fw-semibold priority-${c.priority}">${c.priority}</div></div>
        <div class="col-12"><div class="text-muted">Description</div><div>${escapeHtml(c.description)}</div></div>
        ${c.remark ? `<div class="col-12"><div class="text-muted">Latest Remark</div><div>${escapeHtml(c.remark)}</div></div>` : ""}
      </div>
      ${c.attachments.length ? `<div class="mt-3"><div class="text-muted small mb-1">Attachments</div>${photoChips(c.attachments)}</div>` : ""}
      <div class="row mt-3 g-3">
        ${c.before_photos.length ? `<div class="col-6"><div class="text-muted small mb-1">Before Work Photos</div>${photoChips(c.before_photos)}</div>` : ""}
        ${c.after_photos.length ? `<div class="col-6"><div class="text-muted small mb-1">After Work Photos</div>${photoChips(c.after_photos)}</div>` : ""}
      </div>
      ${c.logs && c.logs.length ? `<div class="mt-3 border-top pt-3">
        <div class="text-muted small mb-2">Status Timeline</div>
        ${c.logs.map(l=>`<div class="d-flex justify-content-between small border-bottom py-1">
          <span><span class="badge-status ${STATUS_BADGE[l.status]||''}" style="font-size:.65rem">${l.status}</span> ${l.remark?('— '+escapeHtml(l.remark)):''}</span>
          <span class="text-muted">${fmtDateTime(l.changed_at)} · ${escapeHtml(l.changed_by||'')}</span>
        </div>`).join("")}
      </div>` : ""}
      ${currentUser && currentUser.role==="admin" ? `<div class="d-flex gap-2 mt-4 border-top pt-3">
        <button class="btn btn-outline-brand btn-sm" data-bs-dismiss="modal" onclick="openAssignModal(${c.id})"><i class="fa-solid fa-user-plus me-1"></i>Assign</button>
        <button class="btn btn-brand btn-sm" data-bs-dismiss="modal" onclick="openUpdateModal(${c.id})"><i class="fa-solid fa-pen me-1"></i>Update</button>
      </div>` : `<div class="d-flex gap-2 mt-4 border-top pt-3">
        <button class="btn btn-brand btn-sm" data-bs-dismiss="modal" onclick="openUpdateModal(${c.id})"><i class="fa-solid fa-pen me-1"></i>Update Progress</button>
      </div>`}
    </div>`;
}

async function openUpdateModal(id){
  let c;
  try{ const res = await api("complaints.php", { params:{action:"get", id} }); c = res.complaint; }
  catch(_) { return; }

  document.getElementById("upd_id_label").textContent = "#"+c.id;
  pendingFiles.before = []; pendingFiles.after = [];
  const isAdmin = currentUser.role === "admin";
  document.getElementById("updateModalBody").innerHTML = `
    <input type="hidden" id="u_id" value="${c.id}">
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Employee</label>
        <select class="form-select" id="u_employee" ${isAdmin?'':'disabled'}>
          <option value="">Unassigned</option>
          ${cache.employees.map(e=>`<option value="${e.id}" ${String(c.assigned_to)===String(e.id)?'selected':''}>${e.name} — ${e.mobile}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-6">
        <label class="form-label">Status</label>
        <select class="form-select" id="u_status">
          ${STATUS_ORDER.concat(["Rejected"]).map(s=>`<option ${c.status===s?'selected':''}>${s}</option>`).join("")}
        </select>
      </div>
      <div class="col-12">
        <label class="form-label">Remark</label>
        <textarea class="form-control" id="u_remark" rows="3">${escapeHtml(c.remark||"")}</textarea>
      </div>
      <div class="col-md-6">
        <label class="form-label">Before Work Photos</label>
        <label class="file-drop d-block" for="u_before"><i class="fa-solid fa-camera me-2"></i>Upload before photos</label>
        <input type="file" id="u_before" class="d-none" multiple accept="image/*">
        <div id="u_before_list" class="mt-2"></div>
      </div>
      <div class="col-md-6">
        <label class="form-label">After Work Photos</label>
        <label class="file-drop d-block" for="u_after"><i class="fa-solid fa-camera-retro me-2"></i>Upload after photos</label>
        <input type="file" id="u_after" class="d-none" multiple accept="image/*">
        <div id="u_after_list" class="mt-2"></div>
      </div>
      <div class="col-md-6">
        <label class="form-label">Completion Date</label>
        <input type="date" class="form-control" id="u_completion" value="${c.completion_date||''}">
      </div>
    </div>`;
  document.getElementById("u_before").addEventListener("change", e=>{
    pendingFiles.before = Array.from(e.target.files);
    renderFileChips("u_before_list", pendingFiles.before, "before");
  });
  document.getElementById("u_after").addEventListener("change", e=>{
    pendingFiles.after = Array.from(e.target.files);
    renderFileChips("u_after_list", pendingFiles.after, "after");
  });
  new bootstrap.Modal(document.getElementById("updateModal")).show();
}

async function saveUpdate(){
  const id = document.getElementById("u_id").value;
  const fd = new FormData();
  fd.append("action","update");
  fd.append("id", id);
  fd.append("employee_id", document.getElementById("u_employee").value);
  fd.append("status", document.getElementById("u_status").value);
  fd.append("remark", document.getElementById("u_remark").value.trim());
  fd.append("completion_date", document.getElementById("u_completion").value);
  pendingFiles.before.forEach(f=>fd.append("before[]", f));
  pendingFiles.after.forEach(f=>fd.append("after[]", f));

  setBusy(true);
  try{
    const res = await api("complaints.php", { method:"POST", form: fd });
    showToast(res.message);
    bootstrap.Modal.getInstance(document.getElementById("updateModal")).hide();
    if(typeof window.refreshView === "function") await window.refreshView();
  } catch(_) {} finally { setBusy(false); }
}
