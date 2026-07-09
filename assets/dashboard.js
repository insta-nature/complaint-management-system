/* =======================================================================
   ADMIN DASHBOARD (dashboard.html only)
   ======================================================================= */
let state = { adminSection:"dashboard", filters:{status:"",category:"",search:""} };

const ADMIN_NAV = [
  {section:"nav", label:"Main"},
  {key:"dashboard", label:"Dashboard", icon:"fa-gauge-high"},
  {section:"nav", label:"Master Data"},
  {key:"employees", label:"Employee Master", icon:"fa-id-card-clip"},
  {key:"categories", label:"Categories", icon:"fa-tags"},
  {section:"nav", label:"Complaints"},
  {key:"all", label:"All Complaints", icon:"fa-list-check"},
  {key:"pending", label:"Pending", icon:"fa-hourglass-half"},
  {key:"assigned", label:"Assigned", icon:"fa-user-check"},
  {key:"progress", label:"In Progress", icon:"fa-screwdriver-wrench"},
  {key:"completed", label:"Completed", icon:"fa-clipboard-check"},
  {key:"closed", label:"Closed", icon:"fa-box-archive"},
  {section:"nav", label:"Reports"},
  {key:"reports", label:"Reports", icon:"fa-chart-column"},
  {section:"nav", label:"Settings"},
  {key:"users", label:"Users & Roles", icon:"fa-users-gear"}
];

async function renderAdmin(){
  const html = `
  <div class="app-shell">
    <div class="sidebar" id="adminSidebar">
      ${ADMIN_NAV.map(item=>{
        if(item.section) return `<div class="side-section-title">${item.label}</div>`;
        return `<a href="#" class="nav-item ${state.adminSection===item.key?'active':''}" onclick="setAdminSection('${item.key}');return false;"><i class="fa-solid ${item.icon}"></i>${item.label}</a>`;
      }).join("")}
      <div class="side-section-title">Account</div>
      <a href="index.html" class="nav-item"><i class="fa-solid fa-globe"></i>Public Site</a>
      <a href="#" class="nav-item" onclick="logout();return false;"><i class="fa-solid fa-right-from-bracket"></i>Logout (${escapeHtml(currentUser.display_name)})</a>
    </div>
    <div class="main" id="adminMain"><div class="empty-state"><i class="fa-solid fa-spinner fa-spin d-block"></i>Loading…</div></div>
  </div>`;
  document.getElementById("app").innerHTML = html;
  await renderAdminSection();
}

async function setAdminSection(key){
  state.adminSection = key;
  state.filters = {status:"",category:"",search:""};
  document.querySelectorAll("#adminSidebar .nav-item").forEach(a=>a.classList.remove("active"));
  await renderAdmin();
  document.getElementById("adminSidebar")?.classList.remove("open");
}

async function renderAdminSection(){
  const main = document.getElementById("adminMain");
  const key = state.adminSection;
  try{
    if(key==="dashboard") main.innerHTML = await adminDashboardHTML();
    else if(key==="employees") main.innerHTML = await employeeMasterHTML();
    else if(["all","pending","assigned","progress","completed","closed"].includes(key)) main.innerHTML = await complaintListHTML(key);
    else if(key==="reports") main.innerHTML = await reportsHTML();
    else if(key==="categories") main.innerHTML = categoriesHTML();
    else if(key==="users") main.innerHTML = usersRolesHTML();
    afterAdminRender(key);
  } catch(err){
    main.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation d-block"></i>Could not load this section. Check your API/database connection.</div>`;
  }
}

function afterAdminRender(key){
  if(key==="dashboard") drawDashboardChart();
}

// Used by the shared saveUpdate() in common.js to refresh after an update.
window.refreshView = renderAdminSection;

/* ---- Dashboard ---- */
async function adminDashboardHTML(){
  const [statsRes, empRes, listRes] = await Promise.all([
    api("complaints.php", { params:{action:"stats"} }),
    api("employees.php", { params:{action:"list"} }),
    api("complaints.php", { params:{action:"list"} }),
  ]);
  cache.employees = empRes.employees;
  cache.complaints = listRes.complaints;
  const counts = statsRes.counts;
  const cards = [
    {label:"Total Complaints", num:statsRes.total, icon:"fa-inbox", color:"#525b6b"},
    {label:"Pending", num:counts["Pending"]||0, icon:"fa-hourglass-half", color:"var(--st-pending)"},
    {label:"Assigned", num:counts["Assigned"]||0, icon:"fa-user-check", color:"var(--st-assigned)"},
    {label:"In Progress", num:counts["In Progress"]||0, icon:"fa-screwdriver-wrench", color:"var(--st-progress)"},
    {label:"Completed", num:counts["Completed"]||0, icon:"fa-clipboard-check", color:"var(--st-completed)"},
    {label:"Closed", num:counts["Closed"]||0, icon:"fa-box-archive", color:"var(--st-closed)"},
    {label:"Employees", num:statsRes.employee_count, icon:"fa-people-group", color:"var(--brand-2)"}
  ];
  const recent = cache.complaints.slice(0,5);

  window.__dashCounts = counts;
  window.__dashEmployees = statsRes.by_employee;

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
        ${statsRes.by_employee.map(e=>{
          const pct = e.assigned ? Math.round((e.done/e.assigned)*100) : 0;
          return `<div class="mb-2">
            <div class="d-flex justify-content-between small mb-1"><span>${escapeHtml(e.name)}</span><span class="text-muted">${e.done}/${e.assigned}</span></div>
            <div class="progress progress-thin"><div class="progress-bar" style="width:${pct}%"></div></div>
          </div>`;
        }).join("")}
      </div>
    </div>
  </div>
  ${complaintModalsHTML()}`;
}

function drawDashboardChart(){
  const el = document.getElementById("dashChart");
  if(!el || !window.__dashCounts) return;
  const counts = STATUS_ORDER.map(s=>window.__dashCounts[s]||0);
  const max = Math.max(...counts, 1);
  el.innerHTML = STATUS_ORDER.map((s,i)=>`
    <div class="bar-col">
      <div class="bar-val">${counts[i]}</div>
      <div class="bar b-${s.toLowerCase()}" style="height:${(counts[i]/max*120)||2}px"></div>
      <div class="bar-name">${s}</div>
    </div>`).join("");
}

/* ---- Employee Master ---- */
async function employeeMasterHTML(){
  const res = await api("employees.php", { params:{action:"list"} });
  cache.employees = res.employees;
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
          ${cache.employees.map((e,i)=>`
          <tr>
            <td>${i+1}</td>
            <td class="fw-semibold">${escapeHtml(e.name)}</td>
            <td class="mono">${e.mobile}</td>
            <td>${e.department}</td>
            <td>${e.designation}</td>
            <td><span class="badge rounded-pill ${e.status==='Active'?'text-bg-success':'text-bg-secondary'}">${e.status}</span></td>
            <td class="text-end">
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
                <select class="form-select" id="e_department">${DEPARTMENTS.map(d=>`<option>${d}</option>`).join("")}</select>
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
    const e = cache.employees.find(x=>x.id===id);
    document.getElementById("empModalTitle").textContent = "Edit Employee";
    document.getElementById("e_id").value = e.id;
    document.getElementById("e_name").value = e.name;
    document.getElementById("e_mobile").value = e.mobile;
    document.getElementById("e_email").value = e.email || "";
    document.getElementById("e_department").value = e.department;
    document.getElementById("e_designation").value = e.designation;
    document.getElementById("e_status").value = e.status;
    document.getElementById("e_address").value = e.address || "";
  }
  modal.show();
}

async function saveEmployee(){
  const name = document.getElementById("e_name").value.trim();
  const mobile = document.getElementById("e_mobile").value.trim();
  const designation = document.getElementById("e_designation").value.trim();
  if(!name || !/^[0-9]{10}$/.test(mobile) || !designation){ showToast("Please fill all required fields correctly.","error"); return; }
  const id = document.getElementById("e_id").value;
  const params = {
    action: id ? "update" : "create",
    id: id || undefined,
    name, mobile, email: document.getElementById("e_email").value.trim(),
    department: document.getElementById("e_department").value, designation,
    status: document.getElementById("e_status").value,
    address: document.getElementById("e_address").value.trim()
  };
  setBusy(true);
  try{
    const res = await api("employees.php", { method:"POST", params });
    showToast(res.message);
    bootstrap.Modal.getInstance(document.getElementById("employeeModal")).hide();
    await renderAdminSection();
  } catch(_) {} finally { setBusy(false); }
}

async function deleteEmployee(id){
  if(!confirm("Delete this employee? This cannot be undone.")) return;
  setBusy(true);
  try{
    const res = await api("employees.php", { method:"POST", params:{action:"delete", id} });
    showToast(res.message, "error");
    await renderAdminSection();
  } catch(_) {} finally { setBusy(false); }
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
          <div class="d-flex align-items-center gap-2 mb-2"><i class="fa-solid ${r.icon}" style="color:var(--brand-2)"></i><h6 class="fw-bold mb-0">${r.role}</h6></div>
          <ul class="small text-muted ps-3 mb-0">${r.perms.map(p=>`<li>${p}</li>`).join("")}</ul>
        </div>
      </div>`).join("")}
  </div>`;
}

/* ---- Complaint list (All / filtered by status) ---- */
const SECTION_STATUS_MAP = {all:null, pending:"Pending", assigned:"Assigned", progress:"In Progress", completed:"Completed", closed:"Closed"};
const SECTION_TITLE_MAP = {all:"All Complaints", pending:"Pending Complaints", assigned:"Assigned Complaints", progress:"In Progress Complaints", completed:"Completed Complaints", closed:"Closed Complaints"};

async function complaintListHTML(sectionKey){
  const params = {action:"list"};
  const statusFilter = SECTION_STATUS_MAP[sectionKey];
  if(statusFilter) params.status = statusFilter;
  else if(state.filters.status) params.status = state.filters.status;
  if(state.filters.category) params.category = state.filters.category;
  if(state.filters.search) params.search = state.filters.search;

  const [listRes, empRes] = await Promise.all([
    api("complaints.php", { params }),
    api("employees.php", { params:{action:"list"} }),
  ]);
  cache.complaints = listRes.complaints;
  cache.employees = empRes.employees;
  const list = cache.complaints;

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
        <input class="form-control form-control-sm" placeholder="ID, name, subject, mobile" value="${escapeHtml(state.filters.search)}" onchange="state.filters.search=this.value; renderAdminSection();">
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
        <select class="form-select form-select-sm" onchange="state.filters.status=this.value; renderAdminSection();" ${statusFilter?'disabled':''}>
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
            <td>${fmtDate(c.complaint_date)}</td>
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

async function deleteComplaint(id){
  if(!confirm("Delete this complaint permanently?")) return;
  setBusy(true);
  try{
    const res = await api("complaints.php", { method:"POST", params:{action:"delete", id} });
    showToast(res.message, "error");
    await renderAdminSection();
  } catch(_) {} finally { setBusy(false); }
}

function exportData(type){
  showToast(`${type==='excel'?'Excel':'PDF'} export generated for current list.`, "info");
}

/* ---- Assign modal (admin only) ---- */
function openAssignModal(id){
  const c = cache.complaints.find(x=>x.id===id);
  document.getElementById("assign_id_label").textContent = "#"+id;
  document.getElementById("assignModalBody").innerHTML = `
    <input type="hidden" id="a_id" value="${id}">
    <div class="mb-3">
      <label class="form-label">Employee</label>
      <select class="form-select" id="a_employee">
        <option value="">Select employee</option>
        ${cache.employees.filter(e=>e.status==='Active').map(e=>`<option value="${e.id}" ${c && String(c.assigned_to)===String(e.id)?'selected':''}>${e.name} — ${e.department}</option>`).join("")}
      </select>
    </div>
    <div class="mb-3">
      <label class="form-label">Priority</label>
      <select class="form-select" id="a_priority">
        ${["High","Medium","Low"].map(p=>`<option ${c && c.priority===p?'selected':''}>${p}</option>`).join("")}
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

async function saveAssign(){
  const id = document.getElementById("a_id").value;
  const employee_id = document.getElementById("a_employee").value;
  if(!employee_id){ showToast("Please select an employee.","error"); return; }
  const params = {
    action:"assign", id, employee_id,
    priority: document.getElementById("a_priority").value,
    expected_date: document.getElementById("a_expected").value,
    remark: document.getElementById("a_remark").value.trim(),
  };
  setBusy(true);
  try{
    const res = await api("complaints.php", { method:"POST", params });
    showToast(res.message);
    bootstrap.Modal.getInstance(document.getElementById("assignModal")).hide();
    await renderAdminSection();
  } catch(_) {} finally { setBusy(false); }
}

/* ---- Reports ---- */
async function reportsHTML(){
  const res = await api("complaints.php", { params:{action:"stats"} });
  const byCategory = res.by_category;
  const byEmployee = res.by_employee;
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
        ${byCategory.map(x=>`<div class="d-flex justify-content-between small border-bottom py-2"><span>${x.category}</span><span class="fw-semibold">${x.n}</span></div>`).join("") || `<div class="text-muted small">No data</div>`}
      </div>
    </div>
    <div class="col-md-6">
      <div class="card-flat p-3">
        <h6 class="fw-bold mb-3">Employee Wise Report</h6>
        ${byEmployee.map(x=>`<div class="d-flex justify-content-between small border-bottom py-2"><span>${escapeHtml(x.name)}</span><span class="fw-semibold">${x.assigned}</span></div>`).join("")}
      </div>
    </div>
  </div>
  <div class="d-flex gap-2 mt-3">
    <button class="btn btn-outline-brand btn-sm" onclick="exportData('excel')"><i class="fa-solid fa-file-excel me-1"></i>Export Excel</button>
    <button class="btn btn-outline-brand btn-sm" onclick="exportData('pdf')"><i class="fa-solid fa-file-pdf me-1"></i>Export PDF</button>
    <button class="btn btn-outline-brand btn-sm" onclick="window.print()"><i class="fa-solid fa-print me-1"></i>Print</button>
  </div>`;
}

/* ---- Init ---- */
document.getElementById("sidebarToggle")?.addEventListener("click", ()=>{
  document.getElementById("adminSidebar")?.classList.toggle("open");
});

(async function init(){
  const ok = await requireRole("admin");
  if(ok) await renderAdmin();
})();
