/* =======================================================================
   PUBLIC VIEW — Register Complaint (index.html only)
   ======================================================================= */
let currentCaptcha = "";

function genCaptcha(){
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  currentCaptcha = s;
  const box = document.getElementById("captchaText");
  if(box) box.textContent = s;
}

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
        <input type="text" class="form-control" id="trackId" placeholder="Enter Complaint ID e.g. 6">
        <button class="btn btn-outline-brand" onclick="trackComplaint()">Track</button>
      </div>
      <div id="trackResult" class="mt-3"></div>
    </div>
  </div>`;
  document.getElementById("app").innerHTML = html;
  document.getElementById("f_date").value = new Date().toISOString().slice(0,10);
  genCaptcha();

  document.getElementById("f_files").addEventListener("change", (e)=>{
    pendingFiles.reg = Array.from(e.target.files);
    renderFileChips("f_files_list", pendingFiles.reg, "reg");
  });

  document.getElementById("complaintForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const mobile = document.getElementById("f_mobile").value.trim();
    const captchaVal = document.getElementById("f_captcha").value.trim().toUpperCase();
    if(!/^[0-9]{10}$/.test(mobile)){ showToast("Please enter a valid 10-digit mobile number.","error"); return; }
    if(captchaVal !== currentCaptcha){ showToast("Captcha does not match. Please try again.","error"); genCaptcha(); document.getElementById("f_captcha").value=""; return; }

    const fd = new FormData();
    fd.append("action","create");
    fd.append("name", document.getElementById("f_name").value.trim());
    fd.append("mobile", mobile);
    fd.append("email", document.getElementById("f_email").value.trim());
    fd.append("subject", document.getElementById("f_subject").value.trim());
    fd.append("category", document.getElementById("f_category").value);
    fd.append("description", document.getElementById("f_desc").value.trim());
    fd.append("date", document.getElementById("f_date").value);
    pendingFiles.reg.forEach(f => fd.append("attachments[]", f));

    setBusy(true);
    try{
      const res = await api("complaints.php", { method:"POST", form: fd });
      showToast(res.message);
      renderPublic();
    } catch(_) { /* toast already shown */ }
    finally { setBusy(false); }
  });
}

async function trackComplaint(){
  const id = document.getElementById("trackId").value.trim();
  const box = document.getElementById("trackResult");
  if(!id){ return; }
  try{
    const res = await api("complaints.php", { params:{action:"track", id} });
    const c = res.complaint;
    box.innerHTML = `
      <div class="border rounded-3 p-3">
        <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">
          <div><span class="mono text-muted">#${c.id}</span> — <strong>${escapeHtml(c.subject)}</strong></div>
          <span class="badge-status ${STATUS_BADGE[c.status]}">${c.status}</span>
        </div>
        ${buildStepper(c.status)}
      </div>`;
  } catch(_) {
    box.innerHTML = `<div class="alert alert-light border text-muted mb-0"><i class="fa-solid fa-circle-info me-2"></i>No complaint found with that ID.</div>`;
  }
}

renderPublic();
