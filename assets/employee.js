/* =======================================================================
   EMPLOYEE PORTAL (employee.html only)
   ======================================================================= */
async function renderEmployee(){
  document.getElementById("app").innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin d-block"></i>Loading…</div>`;
  let assigned = [];
  try{
    const res = await api("complaints.php", { params:{action:"list"} });
    assigned = res.complaints;
    cache.complaints = assigned;
    const empRes = await api("employees.php", { params:{action:"list"} });
    cache.employees = empRes.employees;
  } catch(_) {}

  const html = `
  <div class="app-shell">
    <div class="main" style="flex:1;">
      <div class="page-header">
        <div>
          <h4 class="section-title mb-0">My Assigned Complaints</h4>
          <small class="text-muted">Logged in as ${escapeHtml(currentUser.display_name)}</small>
        </div>
        <div class="d-flex gap-2">
          <a href="index.html" class="btn btn-light border btn-sm"><i class="fa-solid fa-globe me-1"></i>Public Site</a>
          <button class="btn btn-light border btn-sm" onclick="logout()"><i class="fa-solid fa-right-from-bracket me-1"></i>Logout</button>
        </div>
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
                <td>${fmtDate(c.complaint_date)}</td>
                <td><span class="badge-status ${STATUS_BADGE[c.status]}">${c.status}</span></td>
                <td class="text-end">
                  <button class="icon-btn view" onclick="openViewModal(${c.id})" title="View"><i class="fa-solid fa-eye"></i></button>
                  <button class="icon-btn edit" onclick="openUpdateModal(${c.id})" title="Update Progress"><i class="fa-solid fa-pen"></i></button>
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

// Used by the shared saveUpdate() in common.js to refresh after an update.
window.refreshView = renderEmployee;

(async function init(){
  const ok = await requireRole("employee");
  if(ok) await renderEmployee();
})();
