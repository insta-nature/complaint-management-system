
/* =======================================================================
   RESOLVEDESK — Complaint Management System (in-memory demo data layer)
   ======================================================================= */

const STATUS_ORDER = ["Pending","Assigned","In Progress","Completed","Closed"];
const STATUS_BADGE = {
  "Pending":"b-pending","Assigned":"b-assigned","In Progress":"b-progress",
  "Completed":"b-completed","Closed":"b-closed","Rejected":"b-rejected"
};
const CATEGORIES = ["Water Supply","Electricity","Road & Infrastructure","Sanitation","Noise Pollution","Public Property Damage","Street Lighting","Other"];
const DEPARTMENTS = ["Public Works","Electrical","Water Board","Sanitation","Administration"];

let DB = {
  seq: 1006,
  employees: [
    {id:1, name:"Rohit Kadam", mobile:"9876543210", email:"rohit.kadam@resolvedesk.in", dept:"Public Works", designation:"Field Technician", address:"Pune, MH", status:"Active"},
    {id:2, name:"Sunita More", mobile:"9823456712", email:"sunita.more@resolvedesk.in", dept:"Electrical", designation:"Lineman Supervisor", address:"Pune, MH", status:"Active"},
    {id:3, name:"Imran Shaikh", mobile:"9765123480", email:"imran.shaikh@resolvedesk.in", dept:"Water Board", designation:"Plumbing Engineer", address:"Pimpri, MH", status:"Active"},
    {id:4, name:"Aarti Deshmukh", mobile:"9911223344", email:"aarti.d@resolvedesk.in", dept:"Sanitation", designation:"Sanitation Officer", address:"Pune, MH", status:"Inactive"}
  ],
  complaints: [
    {
      id:1001, name:"Vikram Patil", mobile:"9898989898", email:"vikram.p@gmail.com",
      subject:"Frequent power cuts in Sector 7", category:"Electricity",
      description:"Power supply has been cutting off every evening for the past week, sometimes for 3-4 hours.",
      date:"2026-06-25", status:"Closed", priority:"High",
      attachments:["cut_schedule.jpg"], assignedTo:2, remark:"Transformer fuse replaced and load balanced.",
      beforePhotos:["before_transformer.jpg"], afterPhotos:["after_transformer.jpg"], completionDate:"2026-06-29",
      createdAt:"2026-06-25T09:12:00"
    },
    {
      id:1002, name:"Sneha Kulkarni", mobile:"9822011223", email:"sneha.k@gmail.com",
      subject:"Water leakage near main road", category:"Water Supply",
      description:"There is continuous water leakage from an underground pipe near the bus stop, wasting a lot of water.",
      date:"2026-07-01", status:"In Progress", priority:"Medium",
      attachments:["leak_photo1.jpg","leak_photo2.jpg"], assignedTo:3, remark:"Pipe joint identified, parts ordered.",
      beforePhotos:["before_leak.jpg"], afterPhotos:[], completionDate:"",
      createdAt:"2026-07-01T14:40:00"
    },
    {
      id:1003, name:"Ganesh Jadhav", mobile:"9765432190", email:"",
      subject:"Garbage not collected for 5 days", category:"Sanitation",
      description:"Garbage collection truck has not come to our lane in over 5 days, waste is piling up.",
      date:"2026-07-03", status:"Assigned", priority:"High",
      attachments:[], assignedTo:4, remark:"",
      beforePhotos:[], afterPhotos:[], completionDate:"",
      createdAt:"2026-07-03T08:05:00"
    },
    {
      id:1004, name:"Priya Nair", mobile:"9090909090", email:"priya.nair@gmail.com",
      subject:"Broken streetlight on MG Road", category:"Street Lighting",
      description:"Streetlight pole no. 14 has been non-functional for two weeks making the area unsafe at night.",
      date:"2026-07-04", status:"Pending", priority:"Medium",
      attachments:["pole_photo.jpg"], assignedTo:null, remark:"",
      beforePhotos:[], afterPhotos:[], completionDate:"",
      createdAt:"2026-07-04T19:22:00"
    },
    {
      id:1005, name:"Rahul Deshpande", mobile:"9765098123", email:"rahul.d@gmail.com",
      subject:"Pothole causing accidents", category:"Road & Infrastructure",
      description:"Large pothole near the school gate has caused two two-wheeler accidents this month.",
      date:"2026-07-05", status:"Pending", priority:"High",
      attachments:[], assignedTo:null, remark:"",
      beforePhotos:[], afterPhotos:[], completionDate:"",
      createdAt:"2026-07-05T11:15:00"
    }
  ]
};

let state = { role:"public", adminSection:"dashboard", currentEmployeeId:1, filters:{status:"",category:"",search:""} };
let pendingFiles = { reg: [], before: [], after: [] };
let currentCaptcha = "";

/* ---------------- utils ---------------- */
function uid(){ return DB.seq++; }
function fmtDate(d){ if(!d) return "—"; const dt = new Date(d); return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtDateTime(d){ const dt = new Date(d); return dt.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function empName(id){ const e = DB.employees.find(x=>x.id===id); return e? e.name : "Unassigned"; }
function complaintById(id){ return DB.complaints.find(c=>c.id===Number(id)); }
function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

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

function genCaptcha(){
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  currentCaptcha = s;
  const box = document.getElementById("captchaText");
  if(box) box.textContent = s;
}

/* =======================================================================
   PUBLIC VIEW — Register Complaint
   ======================================================================= */
function renderPublic(){
  pendingFiles.reg = [];
  const html = `
  <div class="public-hero">
    <span class="badge bg-white text-dark bg-opacity-25 mb-2" style="letter-spacing:.06em;font-size:.7rem;">CITIZEN SERVICES PORTAL</span>
    <h1>Register a Complaint</h1>
    <p>Tell us what's wrong — road, water, power, or public property. We route it to the right team and keep you posted until it's resolved.</p>
  </div>
  <div class="form-shell">
    <div class="card-flat p-4 p-md-5">
      <div class="section-label">Complaint Details</div>
      <h4 class="mb-4">New Complaint Form</h4>
      <form id="complaintForm" novalidate>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Full Name <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="f_name" required placeholder="e.g. Vikram Patil">
          </div>
          <div class="col-md-6">
            <label class="form-label">Mobile Number <span class="text-danger">*</span></label>
            <input type="tel" class="form-control" id="f_mobile" required pattern="[0-9]{10}" maxlength="10" placeholder="10-digit mobile number">
          </div>
          <div class="col-md-6">
            <label class="form-label">Email <span class="text-muted">(optional)</span></label>
            <input type="email" class="form-control" id="f_email" placeholder="you@example.com">
          </div>
          <div class="col-md-6">
            <label class="form-label">Complaint Date <span class="text-danger">*</span></label>
            <input type="date" class="form-control" id="f_date" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">Category <span class="text-danger">*</span></label>
            <select class="form-select" id="f_category" required>
              <option value="" selected disabled>Choose a category</option>
              ${CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join("")}
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Subject <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="f_subject" required placeholder="Brief title of your complaint">
          </div>
          <div class="col-12">
            <label class="form-label">Description <span class="text-danger">*</span></label>
            <textarea class="form-control" id="f_desc" rows="4" required placeholder="Describe the issue in detail — location, duration, impact..."></textarea>
          </div>
          <div class="col-12">
            <label class="form-label">Attachments <span class="text-muted">(JPG, PNG, PDF, DOC, DOCX — max 10MB each)</span></label>
            <label class="file-drop d-block" for="f_files">
              <i class="fa-solid fa-cloud-arrow-up me-2"></i>Click to choose files, or drag and drop here
            </label>
            <input type="file" id="f_files" class="d-none" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx">
            <div id="f_files_list" class="mt-2"></div>
          </div>
          <div class="col-12">
            <label class="form-label">Verify you're human <span class="text-danger">*</span></label>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="captcha-box" id="captchaText"></span>
              <button type="button" class="btn btn-sm btn-light border" onclick="genCaptcha()"><i class="fa-solid fa-rotate"></i></button>
              <input type="text" class="form-control" id="f_captcha" style="max-width:180px" placeholder="Enter code above" required>
            </div>
          </div>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-4 pt-2 border-top">
          <small class="text-muted">Fields marked <span class="text-danger">*</span> are required</small>
          <button type="submit" class="btn btn-brand px-4 py-2"><i class="fa-solid fa-paper-plane me-2"></i>Submit Complaint</button>
        </div>
      </form>
    </div>

    <div class="card-flat p-4 mt-4">
      <div class="section-label">Track</div>
      <h5 class="mb-3">Already registered? Track your complaint status</h5>
      <div class="input-group" style="max-width:420px">
        <span class="input-group-text bg-white"><i class="fa-solid fa-magnifying-glass text-muted"></i></span>
        <input type="text" class="form-control" id="trackId" placeholder="Enter Complaint ID e.g. 1002">
        <button class="btn btn-outline-brand" onclick="trackComplaint()">Track</button>
      </div>
      <div id="trackResult" class="mt-3"></div>
    </div>
  </div>`;
  document.getElementById("app").innerHTML = html;
  document.getElementById("f_date").value = new Date().toISOString().slice(0,10);
  genCaptcha();

  document.getElementById("f_files").addEventListener("change", (e)=>{
    pendingFiles.reg = Array.from(e.target.files).map(f=>f.name);
    renderFileChips("f_files_list", pendingFiles.reg, "reg");
  });

  document.getElementById("complaintForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const mobile = document.getElementById("f_mobile").value.trim();
    const captchaVal = document.getElementById("f_captcha").value.trim().toUpperCase();
    if(!/^[0-9]{10}$/.test(mobile)){ showToast("Please enter a valid 10-digit mobile number.","error"); return; }
    if(captchaVal !== currentCaptcha){ showToast("Captcha does not match. Please try again.","error"); genCaptcha(); document.getElementById("f_captcha").value=""; return; }

    const newComplaint = {
      id: uid(),
      name: document.getElementById("f_name").value.trim(),
      mobile, email: document.getElementById("f_email").value.trim(),
      subject: document.getElementById("f_subject").value.trim(),
      category: document.getElementById("f_category").value,
      description: document.getElementById("f_desc").value.trim(),
      date: document.getElementById("f_date").value,
      status: "Pending", priority: "Medium",
      attachments: [...pendingFiles.reg],
      assignedTo: null, remark: "",
      beforePhotos: [], afterPhotos: [], completionDate: "",
      createdAt: new Date().toISOString()
    };
    DB.complaints.unshift(newComplaint);
    showToast(`Complaint Registered Successfully. Your Complaint ID is ${newComplaint.id}.`);
    renderPublic();
  });
}

function renderFileChips(containerId, files, tag){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(!files.length){ el.innerHTML = ""; return; }
  el.innerHTML = files.map((f,i)=>`<span class="file-chip"><i class="fa-solid fa-paperclip"></i>${escapeHtml(f)} <i class="fa-solid fa-xmark remove" onclick="removeFile('${tag}',${i},'${containerId}')"></i></span>`).join("");
}
function removeFile(tag, idx, containerId){
  pendingFiles[tag].splice(idx,1);
  renderFileChips(containerId, pendingFiles[tag], tag);
}

function trackComplaint(){
  const id = document.getElementById("trackId").value.trim();
  const c = complaintById(id);
  const box = document.getElementById("trackResult");
  if(!c){ box.innerHTML = `<div class="alert alert-light border text-muted mb-0"><i class="fa-solid fa-circle-info me-2"></i>No complaint found with that ID.</div>`; return; }
  box.innerHTML = `
    <div class="border rounded-3 p-3">
      <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">
        <div><span class="mono text-muted">#${c.id}</span> — <strong>${escapeHtml(c.subject)}</strong></div>
        <span class="badge-status ${STATUS_BADGE[c.status]}">${c.status}</span>
      </div>
      ${buildStepper(c.status)}
    </div>`;
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

/* =======================================================================
   ADMIN VIEW
   ======================================================================= */
const ADMIN_NAV = [
  {section:"nav", label:"Main"},
  {key:"dashboard", label:"Dashboard", icon:"fa-gauge-high"},
  {section:"nav", label:"Master Data"},
//   {key:"employees", label:"Employee Master", icon:"fa-id-card-clip"},
//   {key:"categories", label:"Categories", icon:"fa-tags"},
//   {section:"nav", label:"Complaints"},
  {key:"all", label:"Master", icon:"fa-list-check"},
//   {key:"pending", label:"Pending", icon:"fa-hourglass-half"},
//   {key:"assigned", label:"Assigned", icon:"fa-user-check"},
//   {key:"progress", label:"In Progress", icon:"fa-screwdriver-wrench"},
//   {key:"completed", label:"Completed", icon:"fa-clipboard-check"},
//   {key:"closed", label:"Closed", icon:"fa-box-archive"},
//   {section:"nav", label:"Reports"},
//   {key:"reports", label:"Reports", icon:"fa-chart-column"},
//   {section:"nav", label:"Settings"},
//   {key:"users", label:"Users & Roles", icon:"fa-users-gear"}
];

function renderAdmin(){
  const html = `
  <div class="app-shell">
    <div class="sidebar" id="adminSidebar">
      ${ADMIN_NAV.map(item=>{
        if(item.section) return `<div class="side-section-title">${item.label}</div>`;
        return `<a href="#" class="nav-item ${state.adminSection===item.key?'active':''}" onclick="setAdminSection('${item.key}');return false;"><i class="fa-solid ${item.icon}"></i>${item.label}</a>`;
      }).join("")}
    </div>
    <div class="main" id="adminMain"></div>
  </div>`;
  document.getElementById("app").innerHTML = html;
  renderAdminSection();
}

function setAdminSection(key){
  state.adminSection = key;
  document.querySelectorAll("#adminSidebar .nav-item").forEach(a=>a.classList.remove("active"));
  renderAdmin();
  document.getElementById("adminSidebar")?.classList.remove("open");
}

function renderAdminSection(){
  const main = document.getElementById("adminMain");
  const key = state.adminSection;
  if(key==="dashboard") main.innerHTML = adminDashboardHTML();
  else if(key==="employees") main.innerHTML = employeeMasterHTML();
  else if(["all","pending","assigned","progress","completed","closed"].includes(key)) main.innerHTML = complaintListHTML(key);
  else if(key==="reports") main.innerHTML = reportsHTML();
  else if(key==="categories") main.innerHTML = categoriesHTML();
  else if(key==="users") main.innerHTML = usersRolesHTML();
  afterAdminRender(key);
}

function afterAdminRender(key){
  if(key==="dashboard") drawDashboardChart();
}

/* ---- Dashboard ---- */
function adminDashboardHTML(){
  const total = DB.complaints.length;
  const pending = DB.complaints.filter(c=>c.status==="Pending").length;
  const assigned = DB.complaints.filter(c=>c.status==="Assigned").length;
  const progress = DB.complaints.filter(c=>c.status==="In Progress").length;
  const completed = DB.complaints.filter(c=>c.status==="Completed").length;
  const closed = DB.complaints.filter(c=>c.status==="Closed").length;
  const empCount = DB.employees.length;

  const cards = [
    {label:"Total Complaints", num:total, icon:"fa-inbox", color:"#525b6b"},
    {label:"Pending", num:pending, icon:"fa-hourglass-half", color:"var(--st-pending)"},
    {label:"Assigned", num:assigned, icon:"fa-user-check", color:"var(--st-assigned)"},
    {label:"In Progress", num:progress, icon:"fa-screwdriver-wrench", color:"var(--st-progress)"},
    {label:"Completed", num:completed, icon:"fa-clipboard-check", color:"var(--st-completed)"},
    {label:"Closed", num:closed, icon:"fa-box-archive", color:"var(--st-closed)"},
    {label:"Employees", num:empCount, icon:"fa-people-group", color:"var(--brand-2)"}
  ];

  const recent = [...DB.complaints].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);

  return `
  <div class="page-header">
    <div><h4 class="section-title mb-0">Dashboard</h4><small class="text-muted">Overview of all complaint activity</small></div>
    <span class="text-muted small"><i class="fa-regular fa-clock me-1"></i>${new Date().toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</span>
  </div>
  <div class="row g-3 mb-3">
    ${cards.map(c=>`
      <div class="col-6 col-md-4 col-xl-3">
        <div class="card-flat stat-card">
          <div class="icon-wrap" style="background:${c.color}"><i class="fa-solid ${c.icon}"></i></div>
          <div><div class="num">${c.num}</div><div class="label">${c.label}</div></div>
        </div>
      </div>`).join("")}
  </div>
  <div class="row g-3">
    <div class="col-lg-7">
      <div class="card-flat p-3 h-100">
        <h6 class="fw-bold mb-3">Recent Complaints</h6>
        <div class="table-responsive">
          <table class="table table-clean align-middle mb-0">
            <thead><tr><th>ID</th><th>Name</th><th>Subject</th><th>Category</th><th>Status</th></tr></thead>
            <tbody>
              ${recent.map(c=>`<tr style="cursor:pointer" onclick="openViewModal(${c.id})">
                <td class="mono text-muted">#${c.id}</td>
                <td>${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.subject)}</td>
                <td>${c.category}</td>
                <td><span class="badge-status ${STATUS_BADGE[c.status]}">${c.status}</span></td>
              </tr>`).join("") || `<tr><td colspan="5" class="text-center text-muted py-3">No complaints yet</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="col-lg-5">
      <div class="card-flat p-3 mb-3">
        <h6 class="fw-bold mb-2">Complaint Status Chart</h6>
        <div class="chart-bars" id="dashChart"></div>
      </div>
      <div class="card-flat p-3">
        <h6 class="fw-bold mb-3">Employee Performance</h6>
        ${DB.employees.map(e=>{
          const assignedCount = DB.complaints.filter(c=>c.assignedTo===e.id).length;
          const doneCount = DB.complaints.filter(c=>c.assignedTo===e.id && (c.status==="Completed"||c.status==="Closed")).length;
          const pct = assignedCount ? Math.round(doneCount/assignedCount*100) : 0;
          return `<div class="mb-2">
            <div class="d-flex justify-content-between small mb-1"><span>${escapeHtml(e.name)}</span><span class="text-muted">${doneCount}/${assignedCount}</span></div>
            <div class="progress progress-thin"><div class="progress-bar" style="width:${pct}%"></div></div>
          </div>`;
        }).join("")}
      </div>
    </div>
  </div>`;
}

function drawDashboardChart(){
  const el = document.getElementById("dashChart");
  if(!el) return;
  const counts = STATUS_ORDER.map(s=>DB.complaints.filter(c=>c.status===s).length);
  const max = Math.max(...counts, 1);
  el.innerHTML = STATUS_ORDER.map((s,i)=>`
    <div class="bar-col">
      <div class="bar-val">${counts[i]}</div>
      <div class="bar" style="height:${(counts[i]/max*120)||2}px"></div>
      <div class="bar-name">${s}</div>
    </div>`).join("");
}

/* ---- Employee Master ---- */
function employeeMasterHTML(){
  return `
  <div class="page-header">
    <div><h4 class="section-title mb-0">Employee Master</h4><small class="text-muted">Manage field staff and departments</small></div>
    <button class="btn btn-brand" onclick="openEmployeeModal()"><i class="fa-solid fa-plus me-2"></i>Add Employee</button>
  </div>
  <div class="card-flat p-3">
    <div class="table-responsive">
      <table class="table table-clean align-middle mb-0">
        <thead><tr><th>Sr.No</th><th>Employee Name</th><th>Mobile</th><th>Department</th><th>Designation</th><th>Status</th><th class="text-end">Action</th></tr></thead>
        <tbody>
          ${DB.employees.map((e,i)=>`
          <tr>
            <td>${i+1}</td>
            <td class="fw-semibold">${escapeHtml(e.name)}</td>
            <td class="mono">${e.mobile}</td>
            <td>${e.dept}</td>
            <td>${e.designation}</td>
            <td><span class="badge rounded-pill ${e.status==='Active'?'text-bg-success':'text-bg-secondary'}">${e.status}</span></td>
            <td class="text-end">
              <button class="icon-btn view" onclick="viewEmployee(${e.id})" title="View"><i class="fa-solid fa-eye"></i></button>
              <button class="icon-btn edit" onclick="openEmployeeModal(${e.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="icon-btn del" onclick="deleteEmployee(${e.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`).join("") || `<tr><td colspan="7" class="text-center text-muted py-4">No employees added yet</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <div class="modal fade" id="employeeModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header"><h5 class="modal-title" id="empModalTitle">Add Employee</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <form id="employeeForm">
            <input type="hidden" id="e_id">
            <div class="row g-3">
              <div class="col-md-6"><label class="form-label">Employee Name</label><input class="form-control" id="e_name" required></div>
              <div class="col-md-6"><label class="form-label">Mobile Number</label><input class="form-control" id="e_mobile" required pattern="[0-9]{10}" maxlength="10"></div>
              <div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" id="e_email"></div>
              <div class="col-md-6"><label class="form-label">Department</label>
                <select class="form-select" id="e_dept">${DEPARTMENTS.map(d=>`<option>${d}</option>`).join("")}</select>
              </div>
              <div class="col-md-6"><label class="form-label">Designation</label><input class="form-control" id="e_designation" required></div>
              <div class="col-md-6"><label class="form-label">Status</label>
                <select class="form-select" id="e_status"><option>Active</option><option>Inactive</option></select>
              </div>
              <div class="col-12"><label class="form-label">Address</label><textarea class="form-control" id="e_address" rows="2"></textarea></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-light border" data-bs-dismiss="modal" onclick="document.getElementById('employeeForm').reset()">Reset</button>
          <button class="btn btn-brand" onclick="saveEmployee()">Save</button>
        </div>
      </div>
    </div>
  </div>`;
}

function openEmployeeModal(id){
  const modalEl = document.getElementById("employeeModal");
  const modal = new bootstrap.Modal(modalEl);
  document.getElementById("employeeForm").reset();
  document.getElementById("e_id").value = "";
  document.getElementById("empModalTitle").textContent = "Add Employee";
  if(id){
    const e = DB.employees.find(x=>x.id===id);
    document.getElementById("empModalTitle").textContent = "Edit Employee";
    document.getElementById("e_id").value = e.id;
    document.getElementById("e_name").value = e.name;
    document.getElementById("e_mobile").value = e.mobile;
    document.getElementById("e_email").value = e.email;
    document.getElementById("e_dept").value = e.dept;
    document.getElementById("e_designation").value = e.designation;
    document.getElementById("e_status").value = e.status;
    document.getElementById("e_address").value = e.address;
  }
  modal.show();
}

function saveEmployee(){
  const name = document.getElementById("e_name").value.trim();
  const mobile = document.getElementById("e_mobile").value.trim();
  const designation = document.getElementById("e_designation").value.trim();
  if(!name || !/^[0-9]{10}$/.test(mobile) || !designation){ showToast("Please fill all required fields correctly.","error"); return; }
  const id = document.getElementById("e_id").value;
  const data = {
    name, mobile, email: document.getElementById("e_email").value.trim(),
    dept: document.getElementById("e_dept").value, designation,
    status: document.getElementById("e_status").value,
    address: document.getElementById("e_address").value.trim()
  };
  if(id){
    Object.assign(DB.employees.find(x=>x.id===Number(id)), data);
    showToast("Employee updated successfully.");
  } else {
    DB.employees.push({id: uid(), ...data});
    showToast("Employee added successfully.");
  }
  bootstrap.Modal.getInstance(document.getElementById("employeeModal")).hide();
  renderAdminSection();
}

function viewEmployee(id){
  const e = DB.employees.find(x=>x.id===id);
  const assigned = DB.complaints.filter(c=>c.assignedTo===id);
  showToast(`${e.name} — ${assigned.length} complaint(s) assigned`, "info");
}

function deleteEmployee(id){
  if(!confirm("Delete this employee? This cannot be undone.")) return;
  DB.employees = DB.employees.filter(x=>x.id!==id);
  showToast("Employee deleted.", "error");
  renderAdminSection();
}

function categoriesHTML(){
  return `
  <div class="page-header"><h4 class="section-title mb-0">Categories</h4></div>
  <div class="card-flat p-3">
    <div class="d-flex flex-wrap gap-2">
      ${CATEGORIES.map(c=>`<span class="badge rounded-pill text-bg-light border px-3 py-2">${c}</span>`).join("")}
    </div>
  </div>`;
}

function usersRolesHTML(){
  return `
  <div class="page-header"><h4 class="section-title mb-0">Users & Roles</h4></div>
  <div class="row g-3">
    ${[
      {role:"Public User", perms:["Register Complaint","Upload Attachments","Track Complaint"], icon:"fa-user"},
      {role:"Admin", perms:["View Complaints","Assign Employee","Edit / Delete Complaint","Upload Work Photos","Generate Reports","Manage Employees"], icon:"fa-user-shield"},
      {role:"Employee", perms:["View Assigned Complaints","Add Remarks","Upload Before/After Photos","Mark Complaint Completed"], icon:"fa-user-gear"}
    ].map(r=>`
      <div class="col-md-4">
        <div class="card-flat p-3 h-100">
          <div class="d-flex align-items-center gap-2 mb-2"><i class="fa-solid ${r.icon} text-brand" style="color:var(--brand-2)"></i><h6 class="fw-bold mb-0">${r.role}</h6></div>
          <ul class="small text-muted ps-3 mb-0">${r.perms.map(p=>`<li>${p}</li>`).join("")}</ul>
        </div>
      </div>`).join("")}
  </div>`;
}

/* =======================================================================
   COMPLAINT LIST (All / filtered by status)
   ======================================================================= */
const SECTION_STATUS_MAP = {all:null, pending:"Pending", assigned:"Assigned", progress:"In Progress", completed:"Completed", closed:"Closed"};
const SECTION_TITLE_MAP = {all:"All Complaints", pending:"Pending Complaints", assigned:"Assigned Complaints", progress:"In Progress Complaints", completed:"Completed Complaints", closed:"Closed Complaints"};

function getFilteredComplaints(sectionKey){
  const statusFilter = SECTION_STATUS_MAP[sectionKey];
  return DB.complaints.filter(c=>{
    if(statusFilter && c.status!==statusFilter) return false;
    if(state.filters.status && c.status!==state.filters.status) return false;
    if(state.filters.category && c.category!==state.filters.category) return false;
    if(state.filters.search){
      const q = state.filters.search.toLowerCase();
      if(!(String(c.id).includes(q) || c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q) || c.mobile.includes(q))) return false;
    }
    return true;
  }).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
}

function complaintListHTML(sectionKey){
  const list = getFilteredComplaints(sectionKey);
  return `
  <div class="page-header">
    <div><h4 class="section-title mb-0">${SECTION_TITLE_MAP[sectionKey]}</h4><small class="text-muted">${list.length} complaint(s) found</small></div>
    <div class="d-flex gap-2">
      <button class="btn btn-outline-brand btn-sm" onclick="exportData('excel')"><i class="fa-solid fa-file-excel me-1"></i>Export Excel</button>
      <button class="btn btn-outline-brand btn-sm" onclick="exportData('pdf')"><i class="fa-solid fa-file-pdf me-1"></i>Export PDF</button>
    </div>
  </div>
  <div class="card-flat p-3 mb-3">
    <div class="row g-2 align-items-end">
      <div class="col-md-4">
        <label class="form-label small mb-1">Search</label>
        <input class="form-control form-control-sm" placeholder="ID, name, subject, mobile" value="${escapeHtml(state.filters.search)}" oninput="state.filters.search=this.value; renderAdminSection();">
      </div>
      <div class="col-md-3">
        <label class="form-label small mb-1">Category</label>
        <select class="form-select form-select-sm" onchange="state.filters.category=this.value; renderAdminSection();">
          <option value="">All Categories</option>
          ${CATEGORIES.map(c=>`<option ${state.filters.category===c?'selected':''}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label small mb-1">Status</label>
        <select class="form-select form-select-sm" onchange="state.filters.status=this.value; renderAdminSection();">
          <option value="">All Status</option>
          ${STATUS_ORDER.map(s=>`<option ${state.filters.status===s?'selected':''}>${s}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-2">
        <button class="btn btn-light border btn-sm w-100" onclick="state.filters={status:'',category:'',search:''}; renderAdminSection();"><i class="fa-solid fa-filter-circle-xmark me-1"></i>Clear</button>
      </div>
    </div>
  </div>
  <div class="card-flat p-3">
    <div class="table-responsive">
      <table class="table table-clean align-middle mb-0">
        <thead><tr><th>Sr.No</th><th>ID</th><th>Name</th><th>Subject</th><th>Date</th><th>Category</th><th>Priority</th><th>Status</th><th class="text-end">Action</th></tr></thead>
        <tbody>
          ${list.map((c,i)=>`
          <tr>
            <td>${i+1}</td>
            <td class="mono text-muted">#${c.id}</td>
            <td>${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.subject)}</td>
            <td>${fmtDate(c.date)}</td>
            <td>${c.category}</td>
            <td class="priority-${c.priority}">${c.priority}</td>
            <td><span class="badge-status ${STATUS_BADGE[c.status]}">${c.status}</span></td>
            <td class="text-end">
              <button class="icon-btn view" onclick="openViewModal(${c.id})" title="View"><i class="fa-solid fa-eye"></i></button>
              <button class="icon-btn edit" onclick="openUpdateModal(${c.id})" title="Update"><i class="fa-solid fa-pen"></i></button>
              <button class="icon-btn del" onclick="deleteComplaint(${c.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`).join("") || `<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-inbox d-block"></i>No complaints match your filters</div></td></tr>`}
        </tbody>
      </table>
    </div>
  </div>
  ${complaintModalsHTML()}`;
}

function deleteComplaint(id){
  if(!confirm("Delete this complaint permanently?")) return;
  DB.complaints = DB.complaints.filter(c=>c.id!==id);
  showToast("Complaint deleted.", "error");
  renderAdminSection();
}

function exportData(type){
  showToast(`${type==='excel'?'Excel':'PDF'} export generated for current list.`, "info");
}

/* ---- Modals: View / Update / Assign (shared markup, filled dynamically) ---- */
function complaintModalsHTML(){
  return `
  <!-- VIEW MODAL -->
  <div class="modal fade" id="viewModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content"><div class="modal-body p-0" id="viewModalBody"></div></div>
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

  <!-- ASSIGN MODAL -->
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

function openViewModal(id){
  const c = complaintById(id);
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
        <div class="col-md-6"><div class="text-muted">Date Raised</div><div class="fw-semibold">${fmtDate(c.date)}</div></div>
        <div class="col-md-6"><div class="text-muted">Category</div><div class="fw-semibold">${c.category}</div></div>
        <div class="col-md-6"><div class="text-muted">Assigned Employee</div><div class="fw-semibold">${empName(c.assignedTo)}</div></div>
        <div class="col-md-6"><div class="text-muted">Priority</div><div class="fw-semibold priority-${c.priority}">${c.priority}</div></div>
        <div class="col-12"><div class="text-muted">Description</div><div>${escapeHtml(c.description)}</div></div>
        ${c.remark ? `<div class="col-12"><div class="text-muted">Latest Remark</div><div>${escapeHtml(c.remark)}</div></div>` : ""}
      </div>
      ${c.attachments.length ? `<div class="mt-3"><div class="text-muted small mb-1">Attachments</div>${c.attachments.map(f=>`<span class="file-chip"><i class="fa-solid fa-paperclip"></i>${escapeHtml(f)}</span>`).join("")}</div>` : ""}
      <div class="row mt-3 g-3">
        ${c.beforePhotos.length ? `<div class="col-6"><div class="text-muted small mb-1">Before Work Photos</div>${c.beforePhotos.map(()=>`<span class="file-chip"><i class="fa-solid fa-image"></i>before.jpg</span>`).join("")}</div>` : ""}
        ${c.afterPhotos.length ? `<div class="col-6"><div class="text-muted small mb-1">After Work Photos</div>${c.afterPhotos.map(()=>`<span class="file-chip"><i class="fa-solid fa-image"></i>after.jpg</span>`).join("")}</div>` : ""}
      </div>
      <div class="d-flex gap-2 mt-4 border-top pt-3">
        <button class="btn btn-outline-brand btn-sm" data-bs-dismiss="modal" onclick="openAssignModal(${c.id})"><i class="fa-solid fa-user-plus me-1"></i>Assign</button>
        <button class="btn btn-brand btn-sm" data-bs-dismiss="modal" onclick="openUpdateModal(${c.id})"><i class="fa-solid fa-pen me-1"></i>Update</button>
      </div>
    </div>`;
  new bootstrap.Modal(document.getElementById("viewModal")).show();
}

function openUpdateModal(id){
  const c = complaintById(id);
  document.getElementById("upd_id_label").textContent = "#"+c.id;
  pendingFiles.before = []; pendingFiles.after = [];
  document.getElementById("updateModalBody").innerHTML = `
    <input type="hidden" id="u_id" value="${c.id}">
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Employee</label>
        <select class="form-select" id="u_employee">
          <option value="">Unassigned</option>
          ${DB.employees.map(e=>`<option value="${e.id}" ${c.assignedTo===e.id?'selected':''}>${e.name} — ${e.mobile}</option>`).join("")}
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
        <textarea class="form-control" id="u_remark" rows="3">${escapeHtml(c.remark)}</textarea>
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
        <input type="date" class="form-control" id="u_completion" value="${c.completionDate}">
      </div>
    </div>`;
  document.getElementById("u_before").addEventListener("change", e=>{
    pendingFiles.before = Array.from(e.target.files).map(f=>f.name);
    renderFileChips("u_before_list", pendingFiles.before, "before");
  });
  document.getElementById("u_after").addEventListener("change", e=>{
    pendingFiles.after = Array.from(e.target.files).map(f=>f.name);
    renderFileChips("u_after_list", pendingFiles.after, "after");
  });
  new bootstrap.Modal(document.getElementById("updateModal")).show();
}

function saveUpdate(){
  const id = Number(document.getElementById("u_id").value);
  const c = complaintById(id);
  const empVal = document.getElementById("u_employee").value;
  c.assignedTo = empVal ? Number(empVal) : null;
  c.status = document.getElementById("u_status").value;
  c.remark = document.getElementById("u_remark").value.trim();
  if(pendingFiles.before.length) c.beforePhotos = [...c.beforePhotos, ...pendingFiles.before];
  if(pendingFiles.after.length) c.afterPhotos = [...c.afterPhotos, ...pendingFiles.after];
  c.completionDate = document.getElementById("u_completion").value;
  bootstrap.Modal.getInstance(document.getElementById("updateModal")).hide();
  showToast(`Complaint #${id} updated successfully.`);
  renderAdminSection();
}

function openAssignModal(id){
  const c = complaintById(id);
  document.getElementById("assign_id_label").textContent = "#"+c.id;
  document.getElementById("assignModalBody").innerHTML = `
    <input type="hidden" id="a_id" value="${c.id}">
    <div class="mb-3">
      <label class="form-label">Employee</label>
      <select class="form-select" id="a_employee">
        <option value="">Select employee</option>
        ${DB.employees.filter(e=>e.status==='Active').map(e=>`<option value="${e.id}" ${c.assignedTo===e.id?'selected':''}>${e.name} — ${e.dept}</option>`).join("")}
      </select>
    </div>
    <div class="mb-3">
      <label class="form-label">Priority</label>
      <select class="form-select" id="a_priority">
        ${["High","Medium","Low"].map(p=>`<option ${c.priority===p?'selected':''}>${p}</option>`).join("")}
      </select>
    </div>
    <div class="mb-3">
      <label class="form-label">Expected Completion Date</label>
      <input type="date" class="form-control" id="a_expected">
    </div>
    <div class="mb-1">
      <label class="form-label">Remark</label>
      <textarea class="form-control" id="a_remark" rows="2"></textarea>
    </div>`;
  new bootstrap.Modal(document.getElementById("assignModal")).show();
}

function saveAssign(){
  const id = Number(document.getElementById("a_id").value);
  const empVal = document.getElementById("a_employee").value;
  if(!empVal){ showToast("Please select an employee.","error"); return; }
  const c = complaintById(id);
  c.assignedTo = Number(empVal);
  c.priority = document.getElementById("a_priority").value;
  c.remark = document.getElementById("a_remark").value.trim() || c.remark;
  if(c.status==="Pending") c.status = "Assigned";
  bootstrap.Modal.getInstance(document.getElementById("assignModal")).hide();
  showToast(`Complaint #${id} assigned to ${empName(c.assignedTo)}.`);
  renderAdminSection();
}

/* =======================================================================
   REPORTS
   ======================================================================= */
function reportsHTML(){
  const byCategory = CATEGORIES.map(cat=>({cat, count: DB.complaints.filter(c=>c.category===cat).length})).filter(x=>x.count>0);
  const byEmployee = DB.employees.map(e=>({name:e.name, count: DB.complaints.filter(c=>c.assignedTo===e.id).length}));
  return `
  <div class="page-header"><h4 class="section-title mb-0">Reports</h4></div>
  <div class="row g-3 mb-3">
    <div class="col-md-3 col-6"><button class="btn btn-outline-brand w-100 py-3" onclick="showToast('Daily report generated.','info')"><i class="fa-solid fa-calendar-day d-block mb-1"></i>Daily Report</button></div>
    <div class="col-md-3 col-6"><button class="btn btn-outline-brand w-100 py-3" onclick="showToast('Monthly report generated.','info')"><i class="fa-solid fa-calendar d-block mb-1"></i>Monthly Report</button></div>
    <div class="col-md-3 col-6"><button class="btn btn-outline-brand w-100 py-3" onclick="showToast('Pending complaint report generated.','info')"><i class="fa-solid fa-hourglass-half d-block mb-1"></i>Pending Report</button></div>
    <div class="col-md-3 col-6"><button class="btn btn-outline-brand w-100 py-3" onclick="showToast('Closed complaint report generated.','info')"><i class="fa-solid fa-box-archive d-block mb-1"></i>Closed Report</button></div>
  </div>
  <div class="row g-3">
    <div class="col-md-6">
      <div class="card-flat p-3">
        <h6 class="fw-bold mb-3">Category Wise Report</h6>
        ${byCategory.map(x=>`<div class="d-flex justify-content-between small border-bottom py-2"><span>${x.cat}</span><span class="fw-semibold">${x.count}</span></div>`).join("") || `<div class="text-muted small">No data</div>`}
      </div>
    </div>
    <div class="col-md-6">
      <div class="card-flat p-3">
        <h6 class="fw-bold mb-3">Employee Wise Report</h6>
        ${byEmployee.map(x=>`<div class="d-flex justify-content-between small border-bottom py-2"><span>${x.name}</span><span class="fw-semibold">${x.count}</span></div>`).join("")}
      </div>
    </div>
  </div>
  <div class="d-flex gap-2 mt-3">
    <button class="btn btn-outline-brand btn-sm" onclick="exportData('excel')"><i class="fa-solid fa-file-excel me-1"></i>Export Excel</button>
    <button class="btn btn-outline-brand btn-sm" onclick="exportData('pdf')"><i class="fa-solid fa-file-pdf me-1"></i>Export PDF</button>
    <button class="btn btn-outline-brand btn-sm" onclick="window.print()"><i class="fa-solid fa-print me-1"></i>Print</button>
  </div>`;
}

/* =======================================================================
   EMPLOYEE VIEW
   ======================================================================= */
function renderEmployee(){
  const emp = DB.employees.find(e=>e.id===state.currentEmployeeId) || DB.employees[0];
  const assigned = DB.complaints.filter(c=>c.assignedTo===emp.id);
  const html = `
  <div class="app-shell">
    <div class="main" style="flex:1;">
      <div class="page-header">
        <div>
          <h4 class="section-title mb-0">My Assigned Complaints</h4>
          <small class="text-muted">Logged in as</small>
        </div>
        <select class="form-select form-select-sm" style="max-width:260px" onchange="state.currentEmployeeId=Number(this.value); renderEmployee();">
          ${DB.employees.map(e=>`<option value="${e.id}" ${e.id===emp.id?'selected':''}>${e.name} (${e.dept})</option>`).join("")}
        </select>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-md-4"><div class="card-flat stat-card"><div class="icon-wrap" style="background:var(--st-assigned)"><i class="fa-solid fa-clipboard-list"></i></div><div><div class="num">${assigned.length}</div><div class="label">Total Assigned</div></div></div></div>
        <div class="col-md-4"><div class="card-flat stat-card"><div class="icon-wrap" style="background:var(--st-progress)"><i class="fa-solid fa-screwdriver-wrench"></i></div><div><div class="num">${assigned.filter(c=>c.status==='In Progress').length}</div><div class="label">In Progress</div></div></div></div>
        <div class="col-md-4"><div class="card-flat stat-card"><div class="icon-wrap" style="background:var(--st-completed)"><i class="fa-solid fa-circle-check"></i></div><div><div class="num">${assigned.filter(c=>c.status==='Completed'||c.status==='Closed').length}</div><div class="label">Completed</div></div></div></div>
      </div>
      <div class="card-flat p-3">
        <div class="table-responsive">
          <table class="table table-clean align-middle mb-0">
            <thead><tr><th>ID</th><th>Subject</th><th>Category</th><th>Priority</th><th>Date</th><th>Status</th><th class="text-end">Action</th></tr></thead>
            <tbody>
              ${assigned.map(c=>`
              <tr>
                <td class="mono text-muted">#${c.id}</td>
                <td>${escapeHtml(c.subject)}</td>
                <td>${c.category}</td>
                <td class="priority-${c.priority}">${c.priority}</td>
                <td>${fmtDate(c.date)}</td>
                <td><span class="badge-status ${STATUS_BADGE[c.status]}">${c.status}</span></td>
                <td class="text-end">
                  <button class="icon-btn view" onclick="openViewModal(${c.id})" title="View"><i class="fa-solid fa-eye"></i></button>
                  <button class="icon-btn edit" onclick="openEmpUpdateModal(${c.id})" title="Update Progress"><i class="fa-solid fa-pen"></i></button>
                </td>
              </tr>`).join("") || `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-clipboard-check d-block"></i>No complaints assigned to you right now</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  ${complaintModalsHTML()}`;
  document.getElementById("app").innerHTML = html;
}

function openEmpUpdateModal(id){ openUpdateModal(id); }

/* =======================================================================
   ROUTER / INIT
   ======================================================================= */
function setRole(role){
  state.role = role;
  document.querySelectorAll("#roleSwitch button").forEach(b=>b.classList.toggle("active", b.dataset.role===role));
  if(role==="public") renderPublic();
  else if(role==="admin"){ state.adminSection="dashboard"; renderAdmin(); }
  else renderEmployee();
}

document.getElementById("roleSwitch").addEventListener("click", (e)=>{
  const btn = e.target.closest("button");
  if(btn) setRole(btn.dataset.role);
});
document.getElementById("sidebarToggle")?.addEventListener("click", ()=>{
  document.getElementById("adminSidebar")?.classList.toggle("open");
});

setRole("admin");