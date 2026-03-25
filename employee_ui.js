/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: employee_ui.js – Complete Enhanced Employee Management UI            ║
║         (Clock In/Out, Breaks, Overtime, Dashboard, Profile, Attendance)    ║
║         All features integrated and fully functional.                        ║
║         Adapted to StaffHub Pro UI style within existing HTML structure.    ║
╚════════════════════════════════════════════════════════════════════════════╝
*/

/* ══════════════════════════════════════════════════════════════════
   GLOBAL CRASH GUARD — prevents one JS error from killing the whole POS
══════════════════════════════════════════════════════════════════ */
window.onerror = function(msg, src, line, col, err) {
  // Only catch employee_ui errors — don't suppress others
  if (src && src.includes('employee_ui')) {
    console.error('[employee_ui] Caught error:', msg, 'line:', line, err);
    try {
      // Try to close the broken modal gracefully
      const modal = document.getElementById('employee-modal');
      if (modal && modal.classList.contains('active')) {
        modal.classList.remove('active');
        const toasts = document.getElementById('toasts');
        if (toasts) {
          const t = document.createElement('div');
          t.className = 'toast t-err';
          t.textContent = '⚠️ Staff Management restarted. Please try again.';
          toasts.appendChild(t);
          setTimeout(() => t.remove(), 4000);
        }
      }
    } catch(e) { /* silent */ }
    return false; // let it also show in console
  }
  return false;
};

// Ensure 'app' object exists globally.
if (typeof app === 'undefined') {
  window.app = { employees: JSON.parse(localStorage.getItem('pos_employees') || '[]') };
}

/* ── Use window.* for ALL module-level state ──────────────────────────────
   Using window properties instead of let/const prevents the dreaded
   "SyntaxError: Identifier already been declared" crash when the
   browser re-executes the script (tab restore, back-forward cache, etc.)
─────────────────────────────────────────────────────────────────────────── */
if (!window._shpInit) {
  window._shpInit                        = true;
  window.currentEmpModalMainTab          = 'dashboard';
  window.currentEmployeeDetailId         = null;
  window.currentEmployeeDetailSubTab     = 'profile';
  window.currentAttendanceDate           = new Date().toISOString().split('T')[0];
  window.currentAttendancePendingChanges = {};
  window.hasUnsavedAttendanceChanges     = false;
  window.calendarMonth                   = new Date();
  window.salaryMonth                     = new Date();
  window.attendanceHistoryMonth          = new Date();
  window.currentStaffListContainerId     = 'staff-actual-list-container';
  window.currentFormSubTab               = 'profile';
  window.employeeSortField               = 'name';
  window.employeeSortDirection           = 1;
  window.attendanceFlatpickrInstance     = null;
  window.FORM_STEPS                      = ['profile', 'emergency', 'work'];
  window.AVATAR_COLORS = [
    'linear-gradient(135deg,#8b7cf6,#b4a7ff)',
    'linear-gradient(135deg,#2dd4a0,#5eead4)',
    'linear-gradient(135deg,#f87171,#fca5a5)',
    'linear-gradient(135deg,#fbbf24,#fde68a)',
    'linear-gradient(135deg,#60a5fa,#93c5fd)',
    'linear-gradient(135deg,#f472b6,#f9a8d4)',
    'linear-gradient(135deg,#22d3ee,#67e8f9)',
    'linear-gradient(135deg,#a78bfa,#c4b5fd)'
  ];
}

// ── Utility Functions ──────────────────────────────────────────────────────
function $(id) { try { return document.getElementById(id); } catch(e) { return null; } }

function formatCurrency(amount) {
  try {
    return (typeof app !== 'undefined' && app.currency ? app.currency + ' ' : 'Rs. ') +
           Math.round(amount || 0).toLocaleString('en-PK');
  } catch(e) { return 'Rs. 0'; }
}

function getAvatarColor(name) {
  if (!name) return window.AVATAR_COLORS[0];
  try {
    const index = Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % window.AVATAR_COLORS.length;
    return window.AVATAR_COLORS[index];
  } catch(e) { return window.AVATAR_COLORS[0]; }
}

function showToast(msg, type) {
  type = type || 'ok';
  try {
    const toastsContainer = $('toasts');
    if (!toastsContainer) return;
    const el = document.createElement('div');
    el.className = 'toast t-' + type;
    el.innerHTML = '<span>' + msg + '</span>';
    toastsContainer.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(50px)'; setTimeout(() => el.remove(), 300); }, 3000);
  } catch(e) { console.warn('showToast error:', e); }
}

function showConfirm(title, message, icon, btnText, callback) {
  try {
    if (confirm(title + '\n' + message)) callback();
  } catch(e) { console.warn('showConfirm error:', e); }
}

function closeModal(id) {
  try {
    const el = $(id); if (el) el.classList.remove('active');
  } catch(e) { console.warn('closeModal error:', e); }
}

// ── Date utilities ─────────────────────────────────────────────────────────
function getTodayDateString() { try { return new Date().toISOString().split('T')[0]; } catch(e) { return '2026-01-01'; } }
function formatDateShort(ds) { try { return new Date(ds+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}); } catch(e) { return ds||''; } }
function formatMonthYear(date) { try { return date.toLocaleDateString('en-US',{year:'numeric',month:'long'}); } catch(e) { return ''; } }
function formatTime(t) { if (!t) return '—'; try { const p=t.split(':'); return p[0]+':'+p[1]; } catch(e) { return t; } }


// ========== MAIN EMPLOYEE MODAL UI FUNCTIONS ==========

/* ── Inject mobile-responsive CSS once ─────────────────────────────── */
(function injectSHPMobileCSS() {
  try {
    if ($('shp-mobile-css')) return;
  const s = document.createElement('style');
  s.id = 'shp-mobile-css';
  s.textContent = `
/* ═══ EMPLOYEE MODAL — MOBILE RESPONSIVE (StaffHub Pro) ═══ */
#employee-modal .modal-content.adv-modal-wide {
  max-width:1200px !important;
  width:98vw !important;
  margin:0 auto !important;
  border-radius:16px !important;
  max-height:96vh !important;
  overflow:hidden !important;
}
#employee-modal .manager-content-layout {
  display:flex !important;
  flex-direction:row !important;
  height:80vh !important;
  overflow:hidden !important;
  min-height:0 !important;
}
/* Flex scroll fix — without min-height:0, flex children never scroll */
#employee-modal .manager-form-side {
  min-height:0 !important;
}
#employee-modal .manager-form-content {
  min-height:0 !important;
  overflow-y:auto !important;
}
/* Neu-card inside content must NOT clip content */
#employee-modal .neu-card {
  overflow:visible !important;
}
/* History card scrollable */
#employee-modal #attendance-history-card {
  overflow:visible !important;
}
#employee-modal .hist-tw {
  overflow-x:auto !important;
  overflow-y:auto !important;
  max-height:none !important;
}
/* ── MOBILE ≤ 640px ──────────────────────────── */
@media(max-width:640px){
  #employee-modal .modal-content.adv-modal-wide {
    width:100vw !important; max-width:100vw !important;
    height:100dvh !important; max-height:100dvh !important;
    border-radius:0 !important; margin:0 !important;
    overflow:hidden !important;
  }
  #employee-modal .manager-content-layout {
    flex-direction:column !important;
    height:calc(100dvh - 48px) !important;
    min-height:0 !important;
    overflow:hidden !important;
  }
  /* Sidebar → compact top tab bar */
  #employee-modal .manager-list-side {
    width:100% !important; min-width:0 !important;
    flex:0 0 auto !important;
    flex-direction:row !important; align-items:center !important;
    border-right:none !important; border-bottom:1px solid rgba(163,177,198,.3) !important;
    border-radius:0 !important; overflow:hidden !important;
    background:#e8ecf2 !important; flex-shrink:0 !important;
  }
  #employee-modal .s-hd { display:none !important; }
  #employee-modal .s-nav {
    flex-direction:row !important; flex-wrap:nowrap !important;
    overflow-x:auto !important; overflow-y:hidden !important;
    padding:6px 8px !important; gap:4px !important; flex:1 !important;
    scrollbar-width:none !important;
  }
  #employee-modal .s-nav::-webkit-scrollbar { display:none !important; }
  #employee-modal .s-sec { display:none !important; }
  #employee-modal .s-it {
    flex-shrink:0 !important; flex-direction:column !important;
    padding:6px 10px !important; border-radius:8px !important;
    font-size:9px !important; gap:2px !important; min-width:60px !important;
    white-space:nowrap !important;
  }
  #employee-modal .s-it .ic { font-size:16px !important; width:auto !important; }
  #employee-modal .s-ft { display:none !important; }

  /* Content side — MUST be scrollable */
  #employee-modal .manager-form-side {
    flex:1 !important; min-height:0 !important;
    overflow-y:auto !important; overflow-x:hidden !important;
    border-radius:0 !important;
    -webkit-overflow-scrolling:touch !important;
  }
  #employee-modal .manager-form-content {
    padding:12px !important;
    overflow-y:visible !important; /* let parent scroll */
    min-height:0 !important;
    flex:none !important; /* don't stretch, let content define height */
  }

  /* ── DETAIL TABS — must always be fully visible ── */
  #employee-modal .tabs {
    display:flex !important;
    flex-direction:row !important;
    flex-wrap:nowrap !important;
    overflow-x:auto !important;
    overflow-y:visible !important;
    -webkit-overflow-scrolling:touch !important;
    scrollbar-width:none !important;
    gap:4px !important;
    padding:4px !important;
    min-height:44px !important;
    height:auto !important;
    background:#e4e9f0 !important;
    border-radius:10px !important;
    margin-bottom:14px !important;
    box-shadow:inset 2px 2px 4px rgba(163,177,198,.5),inset -2px -2px 4px rgba(255,255,255,.85) !important;
  }
  #employee-modal .tabs::-webkit-scrollbar { display:none !important; }
  #employee-modal .tabs .tab {
    padding:8px 12px !important; font-size:10px !important;
    flex-shrink:0 !important; white-space:nowrap !important;
    height:auto !important; min-height:36px !important;
    display:inline-flex !important; align-items:center !important;
  }
  #employee-modal .tabs .tab.on {
    background:#6c5ce7 !important; color:#fff !important;
    border-radius:8px !important;
    box-shadow:2px 2px 6px rgba(108,92,231,.3) !important;
  }

  /* Attendance table → cards on mobile */
  #employee-modal .ma-tw { display:none !important; }
  #employee-modal .ma-cards { display:flex !important; flex-direction:column !important; gap:8px !important; padding:10px 12px !important; }

  /* History section — full height, no clipping */
  #employee-modal #attendance-history-card {
    overflow:visible !important; margin-bottom:20px !important;
  }
  #employee-modal .hist-tw {
    overflow-x:auto !important; overflow-y:visible !important;
    max-height:none !important; -webkit-overflow-scrolling:touch !important;
  }
  #employee-modal .hist-tw table { min-width:380px !important; }
  #employee-modal .hist-tw th { font-size:9px !important; padding:6px 8px !important; }
  #employee-modal .hist-tw td { font-size:11px !important; padding:6px 8px !important; }

  /* Stats grid compact */
  #employee-modal .stats {
    grid-template-columns:repeat(2,1fr) !important;
    gap:8px !important;
  }
  #employee-modal .st { padding:10px 8px !important; }
  #employee-modal .st-v { font-size:16px !important; }
  #employee-modal .ma-sum {
    grid-template-columns:repeat(4,1fr) !important;
    gap:6px !important; padding:10px !important;
  }
  #employee-modal .ma-footer {
    flex-direction:column !important; align-items:stretch !important; gap:8px !important;
  }
  #employee-modal .btn-save-big {
    width:100% !important; justify-content:center !important;
    padding:14px !important; font-size:13px !important;
  }
  /* Topbar compact */
  #employee-modal .topbar {
    flex-direction:row !important; flex-wrap:wrap !important; gap:8px !important; margin-bottom:12px !important;
  }
  #employee-modal .tb-l h2 { font-size:16px !important; }
  /* Sort bar wrap */
  #employee-modal .sort-bar { flex-wrap:wrap !important; gap:6px !important; }
  /* Staff bar chips hidden on mobile */
  #employee-modal .sbar .s-chips { display:none !important; }
  #employee-modal .sbar .s-act { opacity:1 !important; }
  /* Profile/info grid */
  #employee-modal .pgrid { grid-template-columns:1fr !important; }
  /* d-hero compact */
  #employee-modal .d-hero {
    flex-wrap:wrap !important; gap:10px !important; padding:14px !important;
    align-items:flex-start !important;
  }
  #employee-modal .d-av { width:44px !important; height:44px !important; font-size:18px !important; }
  #employee-modal .d-info { flex:1 !important; min-width:0 !important; }
  #employee-modal .d-info h2 { font-size:16px !important; }
  #employee-modal .d-chips { flex-wrap:wrap !important; gap:5px !important; }
  #employee-modal .d-act { flex-direction:row !important; margin-left:0 !important; width:100% !important; }
  /* Salary grid */
  #employee-modal .sal-g { grid-template-columns:repeat(2,1fr) !important; }
  /* Ledger ls grid */
  #employee-modal .ls { grid-template-columns:repeat(3,1fr) !important; }
  /* Ledger table scroll */
  #employee-modal .tw { overflow-x:auto !important; }
  #employee-modal .tw table { min-width:380px !important; }
  /* Modal header */
  #employee-modal .manager-header-bar { padding:10px 14px !important; }
  #employee-modal .manager-header-bar h3 { font-size:13px !important; }
  /* Calendar grid */
  #employee-modal .cal-grid { grid-template-columns:repeat(7,1fr) !important; gap:3px !important; padding:8px !important; }
  /* icard info rows — stack on mobile */
  #employee-modal .ic-r > div { flex-direction:column !important; align-items:flex-start !important; gap:2px !important; }
  /* Neu cards on mobile — no overflow clip */
  #employee-modal .neu-card,
  #employee-modal .neu-card-flat,
  #employee-modal .tcard,
  #employee-modal .icard {
    overflow:visible !important;
  }
  /* Footer buttons on mobile */
  #employee-modal .manager-footer {
    flex-wrap:wrap !important; gap:8px !important; padding:10px 12px !important;
  }
}
/* ── TABLET 641–900px ────────────────────────── */
@media(min-width:641px) and (max-width:900px){
  #employee-modal .modal-content.adv-modal-wide {
    width:96vw !important; max-width:96vw !important;
    max-height:94vh !important;
  }
  #employee-modal .manager-list-side { width:180px !important; min-width:180px !important; flex:0 0 180px !important; }
  #employee-modal .s-it { font-size:11px !important; padding:8px 10px !important; }
  #employee-modal .stats { grid-template-columns:repeat(3,1fr) !important; }
  #employee-modal .ma-tw { overflow-x:auto !important; }
  #employee-modal .pgrid { grid-template-columns:1fr !important; }
}
/* Show ma-cards only on mobile */
#employee-modal .ma-cards { display:none; }
/* Attendance card (mobile card-row) */
#employee-modal .att-card {
  background:#e8ecf2;
  border-radius:12px;
  padding:12px;
  box-shadow:3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85);
}
#employee-modal .att-card-top {
  display:flex; align-items:center; gap:10px; margin-bottom:10px;
}
#employee-modal .att-card-body {
  display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:8px;
}
#employee-modal .att-field label {
  font-size:8px; font-weight:700; color:#95a5a6;
  text-transform:uppercase; letter-spacing:.6px; display:block; margin-bottom:3px;
}
#employee-modal .att-field input {
  width:100%; padding:6px 8px;
  background:#e4e9f0; border:none; border-radius:6px;
  font-size:11px; color:#2d3436; font-family:inherit;
  box-shadow:inset 2px 2px 4px rgba(163,177,198,.5),inset -2px -2px 4px rgba(255,255,255,.85);
}
/* ══ STAFF SAVED SUCCESS POPUP ══════════════════════════════════ */
#shp-success-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(163,177,198,.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:shpOvIn .22s ease both}
@keyframes shpOvIn{from{opacity:0}to{opacity:1}}
#shp-success-overlay.shp-out{animation:shpOvOut .18s ease both}
@keyframes shpOvOut{from{opacity:1}to{opacity:0}}
#shp-success-card{background:#e8ecf2;border-radius:24px;padding:36px 40px 32px;text-align:center;max-width:340px;width:88vw;box-shadow:12px 12px 28px rgba(163,177,198,.55),-12px -12px 28px rgba(255,255,255,.9);animation:shpCardIn .22s cubic-bezier(.175,.885,.32,1.275) both;position:relative}
@keyframes shpCardIn{from{opacity:0;transform:scale(.82) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
#shp-success-card.shp-out{animation:shpCardOut .18s ease both}
@keyframes shpCardOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.9)}}
.shp-check-ring{width:80px;height:80px;border-radius:50%;margin:0 auto 18px;background:linear-gradient(135deg,#00b894,#00cec9);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,184,148,.4);animation:shpRingPop .28s cubic-bezier(.175,.885,.32,1.275) .05s both}
@keyframes shpRingPop{from{transform:scale(0) rotate(-90deg)}to{transform:scale(1) rotate(0deg)}}
.shp-check-ring svg{width:38px;height:38px;stroke:#fff;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round;fill:none}
.shp-check-path{stroke-dasharray:50;stroke-dashoffset:50;animation:shpCheckDraw .25s ease .28s both}
@keyframes shpCheckDraw{to{stroke-dashoffset:0}}
.shp-new-av{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff;margin:0 auto 12px;box-shadow:4px 4px 12px rgba(163,177,198,.5),-4px -4px 12px rgba(255,255,255,.85);animation:shpAvIn .25s cubic-bezier(.175,.885,.32,1.275) .1s both}
@keyframes shpAvIn{from{transform:scale(0)}to{transform:scale(1)}}
.shp-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:24px}
.shp-dot{position:absolute;width:8px;height:8px;border-radius:50%;animation:shpDotFly .55s ease both}
@keyframes shpDotFly{from{transform:translateY(0) scale(0);opacity:1}to{transform:translateY(-80px) scale(1.2);opacity:0}}
#shp-success-card h2{font-size:20px;font-weight:800;color:#2d3436;margin:0 0 6px;letter-spacing:-.3px}
#shp-success-card p{font-size:13px;color:#636e72;margin:0 0 18px;line-height:1.5}
.shp-role-tag{display:inline-flex;align-items:center;gap:5px;background:#e4e9f0;border-radius:20px;padding:5px 14px;font-size:11px;font-weight:700;color:#6c5ce7;box-shadow:inset 2px 2px 4px rgba(163,177,198,.5),inset -2px -2px 4px rgba(255,255,255,.85);margin-bottom:18px}
.shp-goto-btn{width:100%;padding:13px;background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:4px 4px 14px rgba(108,92,231,.4),-3px -3px 10px rgba(255,255,255,.7);transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.shp-goto-btn:hover{transform:translateY(-2px);box-shadow:6px 6px 18px rgba(108,92,231,.45)}
.shp-goto-btn:active{transform:translateY(0)}
.shp-auto-bar{height:3px;background:#e4e9f0;border-radius:2px;margin-top:14px;overflow:hidden;box-shadow:inset 1px 1px 3px rgba(163,177,198,.4)}
.shp-auto-fill{height:100%;width:100%;background:linear-gradient(90deg,#6c5ce7,#00b894);border-radius:2px;transform-origin:left;animation:shpBarShrink 1s linear .15s both}
@keyframes shpBarShrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes shpShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
`;
  document.head.appendChild(s);
  } catch(e) { console.warn('[employee_ui] CSS injection failed:', e); }
})();

function openEmployeeManagement() {
  currentEmployeeDetailId = null;
  currentEmpModalMainTab = 'dashboard';
  const modal = $('employee-modal');
  if (modal) {
    modal.classList.add('active');
    renderEmployeeModalStructure();
    renderEmployeeModalContent();
    initializeFlatpickrs();
  } else {
    showToast('Employee modal not found!', 'err');
  }
}

function renderEmployeeModalStructure() {
  const managerListSide = $('manager-list-side');
  const managerFormSide = $('manager-form-side');

  // Clear existing content in dynamic areas if any, before re-rendering
  managerListSide.innerHTML = '';
  managerFormSide.innerHTML = '';

  // --- Render StaffHub Pro style sidebar (main tabs) within manager-list-side ---
  managerListSide.innerHTML = `
    <div class="s-hd" style="padding:16px;display:flex;align-items:center;gap:10px; border-bottom: 1px solid var(--table-group-line-color);">
        <div class="s-logo" style="width:34px;height:34px;background:linear-gradient(135deg,var(--ac),var(--pk));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:var(--neumorph-in-sm)">⚡</div>
        <h1 style="font-size:14px;font-weight:800;background:linear-gradient(135deg,var(--col-primary),var(--col-secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent">StaffHub Pro</h1>
    </div>
    <nav class="s-nav" style="flex:1; padding:8px; display:flex; flex-direction:column; gap:2px; overflow-y:auto;">
        <div class="s-sec">MAIN</div>
        <button class="s-it ${currentEmpModalMainTab === 'dashboard' ? 'on' : ''}" data-p="dashboard" onclick="switchEmployeeModalMainTab('dashboard')"><span class="ic">📊</span>Dashboard</button>
        <button class="s-it ${currentEmpModalMainTab === 'staff' ? 'on' : ''}" data-p="staff" onclick="switchEmployeeModalMainTab('staff')"><span class="ic">👥</span>Staff</button>
        <button class="s-it ${currentEmpModalMainTab === 'attendance' ? 'on' : ''}" data-p="attendance" onclick="switchEmployeeModalMainTab('attendance')"><span class="ic">📋</span>Attendance Sheet</button>
        <div class="s-sec ${currentEmployeeDetailId ? '' : 'hidden'}" id="ndS">STAFF INFO</div>
        <button class="s-it ${currentEmpModalMainTab === 'detail' && currentEmployeeDetailId ? 'on' : 'hidden'}" data-p="detail" onclick="switchEmployeeModalMainTab('detail')" id="emp-detail-nav-btn"><span id="emp-detail-nav-name">Detail</span></button>
    </nav>
    <div class="s-ft" style="padding:8px;display:flex;flex-direction:column;gap:4px; border-top: 1px solid var(--table-group-line-color);">
        <div class="fr"><button class="fb3" onclick="backupEmployees()">💾 Backup</button><button class="fb4" onclick="$('restore-employees').click()">🔄 Restore</button></div>
        <div class="as"><div class="dot"></div>Auto-saved</div>
        <input type="file" id="restore-employees" class="hidden" accept=".json" onchange="restoreEmployees(this)">
    </div>
  `;

  // --- Prepare manager-form-side for dynamic content ---
  managerFormSide.innerHTML = `
    <div class="manager-form-content" id="employee-modal-main-content" style="flex:1; padding:20px; min-height:0;">
        <!-- Content for Dashboard, Staff/Detail, or Attendance Sheet will load here -->
    </div>
    <div class="manager-footer" id="employee-modal-footer" style="display:none; justify-content: flex-end; padding:15px 20px;">
        <!-- Form specific buttons will appear here -->
    </div>
  `;
  
  // Hide the detail nav button initially until an employee is selected
  $('emp-detail-nav-btn').classList.add('hidden');
  $('ndS').classList.add('hidden');
}

function switchEmployeeModalMainTab(tabName) {
  currentEmpModalMainTab = tabName;
  
  // Update active state of main navigation buttons
  document.querySelectorAll('#employee-modal .s-it').forEach(btn => {
    btn.classList.remove('on');
    if (btn.dataset.p === tabName) {
      btn.classList.add('on');
    }
  });

  // Toggle visibility of "Staff Info" section heading and detail button
  if (tabName === 'detail' && currentEmployeeDetailId) {
      $('ndS').classList.remove('hidden');
      $('emp-detail-nav-btn').classList.remove('hidden');
  } else {
      $('ndS').classList.add('hidden');
      $('emp-detail-nav-btn').classList.add('hidden');
  }

  renderEmployeeModalContent();
}

function renderEmployeeModalContent() {
  const contentArea = $('employee-modal-main-content');
  const footerArea = $('employee-modal-footer');

  contentArea.innerHTML = ''; // Clear previous content
  footerArea.style.display = 'none'; // Hide footer by default

  // Remove any previously rendered dynamic content from left panel (except static nav/footer)
  const leftSide = $('manager-list-side');
  const dynamicElements = leftSide.querySelectorAll('.manager-search-area-dynamic, .sort-bar-dynamic, #staff-actual-list-container, #staff-empty-state-list-side');
  dynamicElements.forEach(el => el.remove());

  switch (currentEmpModalMainTab) {
    case 'dashboard':
      renderDashboardContent(contentArea);
      break;
    case 'staff':
      // Render staff list in the right content area (left panel stays clean)
      renderStaffListInRightPanel(contentArea);
      break;
    case 'attendance':
      renderMasterAttendanceContent(contentArea, footerArea);
      break;
    case 'detail':
      renderEmployeeDetailContent(contentArea, footerArea);
      break;
  }
}

// New function: renders the staff list (search, sort, list) inside the main content area (right panel)
function renderStaffListInRightPanel(container) {
    currentStaffListContainerId = 'staff-list-right-container';

    container.innerHTML = `
        <div class="topbar" style="margin-top:0; padding: 0 0 15px 0; background: transparent; box-shadow: none;">
            <div class="tb-l"><h2><em>Staff Management</em></h2></div>
            <div style="display:flex; gap:8px; align-items:center;">
                <div class="modern-search-input" style="width:200px;">
                    <i class="fas fa-search"></i>
                    <input type="text" id="emp-list-search-right" placeholder="Search staff..." oninput="filterStaffListRight()">
                </div>
                <button class="btn-new-item" onclick="openAddEmployeeForm()">➕ New</button>
            </div>
        </div>
        <div class="sort-bar" style="margin-bottom:15px; display:flex; gap:8px; align-items:center;">
            <label>Sort:</label>
            <button class="sb-b ${employeeSortField === 'name' ? 'on' : ''}" onclick="handleStaffSort('name', this)">Name <span class="ar">${employeeSortField === 'name' ? (employeeSortDirection === 1 ? '↑' : '↓') : '↑'}</span></button>
            <button class="sb-b ${employeeSortField === 'wage' ? 'on' : ''}" onclick="handleStaffSort('wage', this)">Wage <span class="ar">${employeeSortField === 'wage' ? (employeeSortDirection === 1 ? '↑' : '↓') : '↑'}</span></button>
            <button class="sb-b ${employeeSortField === 'balance' ? 'on' : ''}" onclick="handleStaffSort('balance', this)">Balance <span class="ar">${employeeSortField === 'balance' ? (employeeSortDirection === 1 ? '↑' : '↓') : '↑'}</span></button>
            <button class="sb-b ${employeeSortField === 'created' ? 'on' : ''}" onclick="handleStaffSort('created', this)">Newest <span class="ar">${employeeSortField === 'created' ? (employeeSortDirection === 1 ? '↑' : '↓') : '↑'}</span></button>
        </div>
        <div class="manager-list-wrapper" id="${currentStaffListContainerId}" style="flex:1; overflow-y: auto; padding: 0 5px;"></div>
    `;

    // Initial render
    renderEmployeeListContent();
}

// Called when search input in right panel changes
function filterStaffListRight() {
    renderEmployeeListContent();
}

// Handles sort button clicks in the right panel
function handleStaffSort(field, button) {
    if (employeeSortField === field) {
        employeeSortDirection *= -1;
    } else {
        employeeSortField = field;
        employeeSortDirection = 1;
    }
    // Update active state and arrows in the sort bar
    const sortBar = document.querySelector('#employee-modal-main-content .sort-bar');
    if (sortBar) {
        sortBar.querySelectorAll('.sb-b').forEach(btn => {
            btn.classList.remove('on');
            btn.querySelector('.ar').textContent = '↑';
        });
        button.classList.add('on');
        button.querySelector('.ar').textContent = employeeSortDirection === 1 ? '↑' : '↓';
    }
    renderEmployeeListContent();
}

// ========== MAIN TAB CONTENT RENDERING FUNCTIONS ==========

function renderDashboardContent(container) {
  const today = getTodayDateString();
  const summary = getTodayAttendanceSummary();
  const clockedInEmployees = getClockedInEmployees();

  // Placeholder for financial data, derived from all employee ledgers for a simple overview
  const allLedger = app.employees.flatMap(emp => emp.ledger || []);
  const totalCashIn = allLedger.filter(t => t.type === 'cash_in' && t.date === today).reduce((sum, t) => sum + t.amount, 0);
  const totalCashOut = allLedger.filter(t => t.type === 'cash_out' && t.date === today).reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalCashIn - totalCashOut;
  const totalPayrollToday = app.employees.flatMap(emp => (emp.attendance || []).filter(a => a.date === today)).reduce((sum, att) => sum + (att.pay || 0), 0);


  container.innerHTML = `
    <div class="topbar" style="margin-top:0; padding: 0; background: transparent; box-shadow: none;"><div class="tb-l"><h2>📊 <em>Dashboard</em></h2><p style="color: var(--text-secondary);">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div></div>
    <div class="neu-card-flat"><h3 style="font-size:13px;font-weight:700;margin-bottom:10px">📋 Today's Attendance</h3>
        <div class="stats" id="dashboard-attendance-summary"></div>
    </div>
    <div class="neu-card-flat" style="margin-top:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
            <h3 style="font-size:13px;font-weight:700;">💰 Financial Overview (Today)</h3>
        </div>
        <div class="stats" id="dashboard-financial-summary"></div>
    </div>
    <div class="neu-card-flat" style="margin-top:14px;">
        <h3 style="font-size:13px;font-weight:700;margin-bottom:10px">⏰ Currently Clocked In</h3>
        <div id="dashboard-clocked-in-list" style="max-height:200px;overflow-y:auto;"></div>
    </div>
  `;

  const dashboardAttSummary = $('dashboard-attendance-summary');
  if (dashboardAttSummary) {
    dashboardAttSummary.innerHTML = `
      <div class="st"><div class="st-ic" style="background:rgba(108,92,231,.08);color:#6c5ce7;">👥</div><div class="st-v">${summary.total}</div><div class="st-l">Total Staff</div></div>
      <div class="st"><div class="st-ic" style="background:rgba(0,184,148,.08);color:#00856b;">✅</div><div class="st-v amp">${summary.present}</div><div class="st-l">Present</div></div>
      <div class="st"><div class="st-ic" style="background:rgba(0,206,201,.08);color:#009e99;">½</div><div class="st-v" style="color:#009e99">${summary.half}</div><div class="st-l">Half Day</div></div>
      <div class="st"><div class="st-ic" style="background:rgba(231,76,60,.07);color:#c0392b;">❌</div><div class="st-v amn">${summary.absent}</div><div class="st-l">Absent</div></div>
      <div class="st"><div class="st-ic" style="background:rgba(243,156,18,.07);color:#c47f17;">🤒</div><div class="st-v" style="color:#c47f17">${summary.sick}</div><div class="st-l">Sick</div></div>
      <div class="st"><div class="st-ic" style="background:rgba(52,152,219,.07);color:#2471a3;">🏖️</div><div class="st-v" style="color:#2471a3">${summary.leave}</div><div class="st-l">On Leave</div></div>
      <div class="st"><div class="st-ic">❓</div><div class="st-v">${summary.unmarked}</div><div class="st-l">Unmarked</div></div>
      <div class="st"><div class="st-ic" style="background:rgba(108,92,231,.08);color:#6c5ce7;">⏰</div><div class="st-v">${summary.clockedIn}</div><div class="st-l">Clocked In Now</div></div>
    `;
  }

  const dashboardFinSummary = $('dashboard-financial-summary');
  if (dashboardFinSummary) {
    dashboardFinSummary.innerHTML = `
      <div class="st"><div class="st-ic" style="background:rgba(0,184,148,.08);color:#00856b;">💵</div><div class="st-v amp">${formatCurrency(totalCashIn)}</div><div class="st-l">Cash In</div></div>
      <div class="st"><div class="st-ic" style="background:rgba(231,76,60,.07);color:#c0392b;">💸</div><div class="st-v amn">${formatCurrency(totalCashOut)}</div><div class="st-l">Cash Out</div></div>
      <div class="st"><div class="st-ic" style="background:rgba(108,92,231,.08);color:#6c5ce7;">💎</div><div class="st-v ${(netBalance >= 0) ? 'amp' : 'amn'}">${formatCurrency(netBalance)}</div><div class="st-l">Net Balance</div></div>
      <div class="st"><div class="st-ic" style="background:rgba(243,156,18,.07);color:#c47f17;">💰</div><div class="st-v" style="color:#c47f17">${formatCurrency(totalPayrollToday)}</div><div class="st-l">Payroll (Today)</div></div>
    `;
  }

  const clockedInList = $('dashboard-clocked-in-list');
  if (clockedInList) {
    if (clockedInEmployees.length === 0) {
      clockedInList.innerHTML = '<div class="empty" style="padding:20px 0;"><div class="ei" style="font-size:40px; color: var(--text-secondary);">😴</div><h3 style="font-size:14px; margin-bottom:5px; color: var(--text-primary);">No one is clocked in.</h3></div>';
    } else {
      clockedInList.innerHTML = clockedInEmployees.map(emp => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--table-group-line-color);">
          <span style="font-size:12px; color:var(--text-primary)"><strong>${emp.name}</strong> (since ${formatTime(emp.clockInTime)})</span>
          ${emp.breakStarted ? '<span style="color:orange; font-size:10px;">🍵 On Break</span>' : ''}
        </div>
      `).join('');
    }
  }
}

function renderMasterAttendanceContent(container, footerArea) {
  container.innerHTML = `
    <div class="topbar" style="margin-top:0;padding:0;background:transparent;box-shadow:none;">
      <div class="tb-l"><h2>📋 <em>Attendance Sheet</em></h2><p style="color:#95a5a6;">Mark all staff at once, then click Save</p></div>
    </div>
    <div class="neu-card" id="maCard" style="margin-top:0;">
        <div class="ma-top">
            <div class="ma-dw" style="align-items:center;gap:6px;">
                <button class="bic" onclick="changeAttendanceDate(-1)">◀</button>
                <input type="text" id="attendance-sheet-date" style="padding:9px 12px;background:#e4e9f0;border:none;border-radius:8px;color:#2d3436;font-size:12px;font-weight:700;width:200px;text-align:center;font-family:inherit;box-shadow:inset 2px 2px 4px rgba(163,177,198,.5),inset -2px -2px 4px rgba(255,255,255,.85);cursor:pointer;">
                <button class="bic" onclick="changeAttendanceDate(1)">▶</button>
            </div>
            <div class="ma-quick" style="display:flex;gap:5px;align-items:center;margin-left:auto;">
                <button class="btn bg-btn bsm" onclick="setAllStaffAttendance('present')">✅ All Present</button>
                <button class="btn bd bsm" onclick="setAllStaffAttendance('absent')">❌ All Absent</button>
                <button class="btn bo bsm" onclick="clearAllStaffAttendance()">🧹 Clear</button>
            </div>
        </div>
        <div class="ma-sum" id="attendance-summary-stats"></div>
        <div class="ma-tw">
            <table>
                <thead>
                    <tr><th>#</th><th>Staff</th><th>Rate</th><th>Status</th><th>Clock In</th><th>Clock Out</th><th>Break</th><th>Hours</th><th>Pay</th><th>Note</th><th>Actions</th></tr>
                </thead>
                <tbody id="attendance-table-body"></tbody>
            </table>
        </div>
        <!-- Mobile card view — shown instead of table on small screens via CSS -->
        <div class="ma-cards" id="attendance-mobile-cards"></div>
        <div class="ma-footer">
            <div class="mf-total" id="attendance-total-summary"></div>
            <div style="display:flex;align-items:center;gap:10px">
                <span id="attendance-unsaved-badge" style="display:none;align-items:center;gap:5px;padding:6px 14px;background:rgba(243,156,18,.07);border-radius:8px;font-size:10px;font-weight:700;color:#c47f17;box-shadow:inset 2px 2px 4px rgba(163,177,198,.5),inset -2px -2px 4px rgba(255,255,255,.85);">⚠️ Unsaved Changes</span>
                <button class="btn-save-big" id="save-attendance-btn" onclick="saveMasterAttendance()" disabled>💾 Save Attendance</button>
            </div>
        </div>
    </div>
    <div id="master-attendance-empty-state" style="display:none;text-align:center;padding:44px 16px;color:#95a5a6;">
        <div style="font-size:44px;margin-bottom:10px;opacity:.4;">👥</div>
        <h3 style="font-size:15px;margin-bottom:5px;color:#636e72;">No Staff</h3>
        <p style="font-size:12px;">Add staff first to manage attendance.</p>
    </div>

    <div class="neu-card" id="attendance-history-card" style="margin-top:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#dfe4ec;flex-wrap:wrap;gap:8px;">
            <h4 style="font-size:13px;font-weight:700;color:#2d3436;display:flex;align-items:center;gap:6px;">📜 All Staff Attendance History</h4>
            <div style="display:flex;align-items:center;gap:6px;">
                <button class="bic" onclick="changeAttendanceHistoryMonth(-1)">◀</button>
                <span id="attendance-history-month-label" style="font-size:12px;font-weight:700;min-width:118px;text-align:center;color:#2d3436;"></span>
                <button class="bic" onclick="changeAttendanceHistoryMonth(1)">▶</button>
            </div>
        </div>
        <div class="hist-tw" id="all-staff-attendance-history-table" style="padding:8px;"></div>
    </div>
  `;

  if (!app.employees.length) {
    $('master-attendance-empty-state').style.display = 'block';
    $('maCard').style.display = 'none';
  } else {
    $('master-attendance-empty-state').style.display = 'none';
    $('maCard').style.display = '';
    loadPendingAttendanceForDate();
    renderAttendanceSheet();
  }
  // Always load history (shows month + empty message if no records)
  renderAllStaffAttendanceHistory();
}

function renderEmployeeDetailContent(container, footerArea) {
  const emp = app.employees.find(e => e.id === currentEmployeeDetailId);
  if (!emp) {
    showToast('Employee not found', 'err');
    currentEmployeeDetailId = null;
    switchEmployeeModalMainTab('staff'); // Go back to staff list
    return;
  }

  // Update nav button text
  $('emp-detail-nav-btn').classList.remove('hidden');
  $('ndS').classList.remove('hidden'); // Show STAFF INFO heading
  $('emp-detail-nav-name').textContent = emp.name;

  // Render employee detail view
  container.innerHTML = `
    <button class="btn bo bsm" onclick="switchEmployeeModalMainTab('staff')" style="margin-bottom:14px;display:inline-flex;align-items:center;gap:6px;">← Back to Staff List</button>
    <div class="d-hero" id="employee-detail-hero"></div>
    <div class="tabs" id="employee-detail-tabs">
        <button class="tab ${currentEmployeeDetailSubTab === 'profile'  ? 'on' : ''}" onclick="switchEmployeeDetailSubTab('profile', this)">👤 Profile</button>
        <button class="tab ${currentEmployeeDetailSubTab === 'ledger'   ? 'on' : ''}" onclick="switchEmployeeDetailSubTab('ledger', this)">💰 Ledger</button>
        <button class="tab ${currentEmployeeDetailSubTab === 'calendar' ? 'on' : ''}" onclick="switchEmployeeDetailSubTab('calendar', this)">📅 Calendar</button>
        <button class="tab ${currentEmployeeDetailSubTab === 'salary'   ? 'on' : ''}" onclick="switchEmployeeDetailSubTab('salary', this)">💵 Salary</button>
    </div>
    <div id="employee-detail-profile"  style="display:none"></div>
    <div id="employee-detail-ledger"   style="display:none"></div>
    <div id="employee-detail-calendar" style="display:none"></div>
    <div id="employee-detail-salary"   style="display:none"></div>
  `;

  // Render hero section and selected sub-tab
  renderEmployeeDetailHero(emp);
  renderEmployeeDetailSubTabContent();
}

function switchEmployeeDetailSubTab(tabName, button) {
  currentEmployeeDetailSubTab = tabName;
  document.querySelectorAll('#employee-detail-tabs .tab').forEach(btn => btn.classList.remove('on'));
  button.classList.add('on');
  renderEmployeeDetailSubTabContent();
}

function renderEmployeeDetailSubTabContent() {
  const emp = app.employees.find(e => e.id === currentEmployeeDetailId);
  if (!emp) return;

  // Hide ALL tab panels by direct style (no .tc CSS rule exists in styles.css)
  ['employee-detail-profile','employee-detail-ledger','employee-detail-calendar','employee-detail-salary'].forEach(id => {
    const el = $(id);
    if (el) el.style.display = 'none';
  });

  const targetTabContent = $(`employee-detail-${currentEmployeeDetailSubTab}`);
  if (targetTabContent) {
    targetTabContent.style.display = 'block';
    switch (currentEmployeeDetailSubTab) {
      case 'profile':  renderEmployeeProfileTab(emp);  break;
      case 'ledger':   renderEmployeeLedgerTab(emp);   break;
      case 'calendar': renderEmployeeCalendarTab(emp); break;
      case 'salary':   renderEmployeeSalaryTab(emp);   break;
    }
  }
}

function renderEmployeeDetailHero(emp) {
  const avatar = getAvatarColor(emp.name);
  const balance = getEmployeeCashBalance(emp.id);
  const totalCashIn = emp.ledger?.filter(l => l.type === 'cash_in').reduce((sum, l) => sum + l.amount, 0) || 0;
  const totalCashOut = emp.ledger?.filter(l => l.type === 'cash_out').reduce((sum, l) => sum + l.amount, 0) || 0;

  $('employee-detail-hero').innerHTML = `
    <div class="d-av" style="background:${avatar};">${emp.name.charAt(0).toUpperCase()}</div>
    <div class="d-info">
        <h2>${emp.name}</h2>
        <p style="color:var(--text-secondary);">${emp.role || 'Staff'}${emp.idCard ? ' · ' + emp.idCard : ''}</p>
        <div class="d-chips">
            <div class="chip">📱${emp.phone}</div>
            <div class="chip">💰${formatCurrency(emp.wage || 0)}/hr</div>
            <div class="chip">⏰${emp.dutyHours || 12}h</div>
            <div class="chip amp" style="background:rgba(56, 161, 105, 0.1); color:var(--col-success);">↗${formatCurrency(totalCashIn)}</div>
            <div class="chip amn">↙${formatCurrency(totalCashOut)}</div>
            <div class="chip ${balance >= 0 ? 'amp' : 'amn'}">💎${formatCurrency(balance)}</div>
        </div>
    </div>
    <div class="d-act">
        <button class="btn bo bsm" onclick="openAddEmployeeForm('${emp.id}')">✏️ Edit</button>
        <button class="btn bd bsm" onclick="deleteStaff('${emp.id}')">🗑️</button>
    </div>
  `;
}

// ========== STAFF LIST (SUB-COMPONENT) ==========

let employeeSortField = window.employeeSortField || 'name';
let employeeSortDirection = window.employeeSortDirection || 1;

// Renders the employee list into the container specified by currentStaffListContainerId
function renderEmployeeListContent(searchTerm = '') {
    const container = $(currentStaffListContainerId);
    if (!container) return;

    // Get search term from the active input (right panel if it exists, else fallback)
    const searchInput = $('emp-list-search-right') || $('emp-list-search');
    const term = searchTerm || (searchInput ? searchInput.value.toLowerCase() : '');

    let filtered = app.employees.filter(e =>
        e.name.toLowerCase().includes(term) ||
        (e.phone && e.phone.includes(term)) ||
        (e.idCard && e.idCard.toLowerCase().includes(term))
    );

    filtered.sort((a, b) => {
        let valA, valB;
        if (employeeSortField === 'name') {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
            return valA.localeCompare(valB) * employeeSortDirection;
        } else if (employeeSortField === 'wage') {
            valA = a.wage || 0;
            valB = b.wage || 0;
            return (valA - valB) * employeeSortDirection;
        } else if (employeeSortField === 'balance') {
            valA = getEmployeeCashBalance(a.id);
            valB = getEmployeeCashBalance(b.id);
            return (valA - valB) * employeeSortDirection;
        } else if (employeeSortField === 'created') {
            return (new Date(b.created).getTime() - new Date(a.created).getTime()) * employeeSortDirection;
        }
        return 0;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty" style="padding:40px 16px;"><div class="ei" style="font-size:40px; color: var(--text-secondary);">👥</div><h3 style="font-size:14px; margin-bottom:5px; color: var(--text-primary);">No Staff Found</h3><p style="font-size:11px; margin-bottom:14px; color: var(--text-secondary);">Try a different search or add a new team member.</p></div>`;
        return;
    }

    container.innerHTML = filtered.map(emp => {
        const balance = getEmployeeCashBalance(emp.id);
        const avatarBg = getAvatarColor(emp.name);
        const initial = (emp.name || '?')[0].toUpperCase();
        const isSelected = currentEmployeeDetailId === emp.id ? 'on' : '';

        return `
            <div class="sbar ${isSelected}" onclick="selectEmployee('${emp.id}')">
                <div class="av" style="background:${avatarBg};">${initial}</div>
                <div class="s-inf">
                    <div class="si-n" style="color:var(--text-primary);">${emp.name}</div>
                    <div class="si-s" style="color:var(--text-secondary);">
                        <span>📱${emp.phone || ''}</span> · 
                        <span>💰${formatCurrency(emp.wage || 0)}/hr</span> · 
                        <span>⏰${emp.dutyHours || 12}h</span>
                    </div>
                </div>
                <div class="s-chips">
                    <span class="s-chip" style="background:${balance >= 0 ? 'rgba(56, 161, 105, 0.1)' : 'rgba(229, 62, 62, 0.1)'};color:${balance >= 0 ? 'var(--col-success)' : 'var(--col-danger)'}">${formatCurrency(Math.abs(balance))}</span>
                </div>
                <div class="s-act">
                    <button class="bic" onclick="event.stopPropagation();openAddEmployeeForm('${emp.id}')">✏️</button>
                    <button class="bic" onclick="event.stopPropagation();deleteStaff('${emp.id}')" style="color:var(--col-danger)">🗑️</button>
                    <button class="bic" onclick="event.stopPropagation();selectEmployee('${emp.id}')" style="color:var(--col-primary)">→</button>
                </div>
            </div>
        `;
    }).join('');
}


function setEmployeeSort(field, button) {
  if (employeeSortField === field) {
    employeeSortDirection *= -1; // Toggle direction
  } else {
    employeeSortField = field;
    employeeSortDirection = 1; // Default to ascending for new field
  }

  // Update button active states and arrows
  document.querySelectorAll('.sort-bar .sb-b').forEach(btn => {
    btn.classList.remove('on');
    btn.querySelector('.ar').textContent = '↑'; // Reset all arrows
  });
  if (button) {
    button.classList.add('on');
    button.querySelector('.ar').textContent = employeeSortDirection === 1 ? '↑' : '↓';
  }
  renderEmployeeListContent($('emp-list-search')?.value || '');
}

function selectEmployee(id) {
  currentEmployeeDetailId = id;
  switchEmployeeModalMainTab('detail'); // Switch to the detail view
}

// currentFormSubTab and FORM_STEPS are on window (declared at top)

function openAddEmployeeForm(employeeId) {
  employeeId = employeeId || null;
  try {
    currentEmployeeDetailId = employeeId;
    window.currentFormSubTab = 'profile';
    const container = $('employee-modal-main-content');
    const footer    = $('employee-modal-footer');
    if (!container) { showToast('UI error — please reopen Staff Management', 'err'); return; }

  const title = employeeId ? '✏️ Edit Staff Member' : '➕ Add New Staff';

  container.innerHTML = `
    <div class="topbar" style="margin-top:0;padding:0 0 14px 0;background:transparent;box-shadow:none;border-bottom:none;">
      <div class="tb-l"><h2><em>${title}</em></h2></div>
    </div>

    <!-- Step indicator tabs -->
    <div class="tabs" id="employee-form-tabs" style="margin-bottom:18px;">
      <button class="tab on"  id="form-tab-profile"   onclick="switchEmployeeFormSubTab('profile',   this)">👤 Personal Info</button>
      <button class="tab"     id="form-tab-emergency" onclick="switchEmployeeFormSubTab('emergency', this)">🚨 Emergency</button>
      <button class="tab"     id="form-tab-work"      onclick="switchEmployeeFormSubTab('work',      this)">📊 Work & Pay</button>
    </div>

    <!-- Panels — only active one gets display:block -->
    <div id="employee-form-profile"   style="display:block;"></div>
    <div id="employee-form-emergency" style="display:none;"></div>
    <div id="employee-form-work"      style="display:none;"></div>
  `;

  footer.style.display = 'flex';
  footer.innerHTML = `
    <button class="btn bo bsm" onclick="switchEmployeeModalMainTab('staff')" style="padding:10px 18px;font-size:12px;">✕ Cancel</button>
    ${employeeId ? `<button class="btn bd bsm" onclick="deleteStaff('${employeeId}')" style="padding:10px 18px;font-size:12px;">🗑️ Delete</button>` : ''}
    <div style="flex:1;"></div>
    <button class="btn bo bsm" id="form-prev-btn" onclick="formStepNav(-1)" style="padding:10px 16px;font-size:12px;display:none;">◀ Back</button>
    <button class="btn bp bsm" id="form-next-btn" onclick="formStepNav(1)"  style="padding:10px 18px;font-size:12px;">Next ▶</button>
    <button class="btn-save-big" id="form-save-btn" onclick="saveEmployeeForm()" style="display:none;padding:10px 22px;font-size:13px;">💾 Save Staff</button>
  `;

  // Render only the first tab
    renderFormTab('profile');
  } catch(e) {
    console.error('[employee_ui] openAddEmployeeForm crashed:', e);
    showToast('Could not open form — please try again.', 'err');
  }
}

/* Navigate between form steps with Back / Next */
// FORM_STEPS = window.FORM_STEPS = ['profile','emergency','work']
function formStepNav(delta) {
  try {
    var steps = window.FORM_STEPS;
    var idx = steps.indexOf(window.currentFormSubTab);
    var nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= steps.length) return;
    var tabBtn = $('form-tab-' + steps[nextIdx]);
    switchEmployeeFormSubTab(steps[nextIdx], tabBtn);
  } catch(e) { console.error('[employee_ui] formStepNav error:', e); }
}

function switchEmployeeFormSubTab(tabName, button) {
  // Save any typed values from current visible panel before switching
  // (values are preserved because we only hide the div, not remove it)
  currentFormSubTab = tabName;

  // Update tab button active state
  document.querySelectorAll('#employee-form-tabs .tab').forEach(b => b.classList.remove('on'));
  if (button) button.classList.add('on');

  // Show only the target panel
  FORM_STEPS.forEach(step => {
    const el = $(`employee-form-${step}`);
    if (el) el.style.display = step === tabName ? 'block' : 'none';
  });

  // Render content for the newly shown panel (only if empty)
  renderFormTab(tabName);

  // Update footer nav buttons
  const idx      = FORM_STEPS.indexOf(tabName);
  const prevBtn  = $('form-prev-btn');
  const nextBtn  = $('form-next-btn');
  const saveBtn  = $('form-save-btn');
  if (prevBtn) prevBtn.style.display = idx > 0                       ? 'inline-flex' : 'none';
  if (nextBtn) nextBtn.style.display = idx < FORM_STEPS.length - 1   ? 'inline-flex' : 'none';
  if (saveBtn) saveBtn.style.display = idx === FORM_STEPS.length - 1  ? 'inline-flex' : 'none';
}

/* Render content for ONE tab panel only (called lazily) */
function renderFormTab(tabName) {
  const emp = app.employees.find(e => e.id === currentEmployeeDetailId);

  if (tabName === 'profile') {
    const el = $('employee-form-profile');
    if (!el || el.dataset.rendered === '1') return;
    el.dataset.rendered = '1';
    el.innerHTML = `
      <div class="fs">
        <div class="fs-t">👤 Personal Information</div>
        <div class="fr">
          <div class="fg"><label>Full Name *</label>
            <input id="emp-form-name" placeholder="Full name" value="${emp?.name || ''}">
          </div>
          <div class="fg"><label>Phone *</label>
            <input id="emp-form-phone" type="tel" placeholder="e.g. 03001234567" value="${emp?.phone || ''}">
          </div>
        </div>
        <div class="fr">
          <div class="fg"><label>ID Card No.</label>
            <input id="emp-form-id-card" placeholder="XXXXX-XXXXXXX-X" value="${emp?.idCard || ''}">
          </div>
          <div class="fg"><label>Join Date</label>
            <input type="date" id="emp-form-join-date" value="${emp?.joinDate || ''}">
          </div>
        </div>
        <div class="fg"><label>Address</label>
          <textarea id="emp-form-address" rows="2" placeholder="Home address">${emp?.address || ''}</textarea>
        </div>
        <div class="fg"><label>Role / Position</label>
          <input id="emp-form-role" type="text" placeholder="e.g. Waiter, Cashier, Cook" value="${emp?.role || ''}">
        </div>
      </div>`;
  }

  if (tabName === 'emergency') {
    const el = $('employee-form-emergency');
    if (!el || el.dataset.rendered === '1') return;
    el.dataset.rendered = '1';
    el.innerHTML = `
      <div class="fs">
        <div class="fs-t">🚨 Emergency Contact</div>
        <div class="fr">
          <div class="fg"><label>Contact Name</label>
            <input id="emp-form-relative-name" placeholder="Emergency contact name" value="${emp?.relativeName || ''}">
          </div>
          <div class="fg"><label>Contact Phone</label>
            <input id="emp-form-relative-phone" type="tel" placeholder="Phone number" value="${emp?.relativePhone || ''}">
          </div>
        </div>
        <div class="fg"><label>Relationship</label>
          <input id="emp-form-relative-relation" placeholder="e.g. Spouse, Parent, Sibling" value="${emp?.relativeRelation || ''}">
        </div>
        <div class="fg"><label>Address</label>
          <textarea id="emp-form-relative-address" rows="2" placeholder="Emergency contact address">${emp?.relativeAddress || ''}</textarea>
        </div>
      </div>`;
  }

  if (tabName === 'work') {
    const el = $('employee-form-work');
    if (!el || el.dataset.rendered === '1') return;
    el.dataset.rendered = '1';
    const wageVal      = (emp && emp.wage      !== undefined) ? emp.wage      : '';
    const dutyHours    = (emp && emp.dutyHours !== undefined) ? emp.dutyHours : 12;
    const dutyStart    = emp?.dutyStart    || '12:00';
    const dutyEnd      = emp?.dutyEnd      || '00:00';
    const breakStart   = emp?.breakStart   || '';
    const breakEnd     = emp?.breakEnd     || '';
    const defaultBreak = emp?.defaultBreak !== undefined ? emp.defaultBreak : 0;

    /* Format HH:MM for display */
    function fmtHHMM(hhmm) {
      if (!hhmm) return '—';
      const p = hhmm.split(':');
      let h = parseInt(p[0],10), m = parseInt(p[1],10);
      const ap = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12; if (h === 0) h = 12;
      return h + ':' + String(m).padStart(2,'0') + ' ' + ap;
    }
    /* Build a clock-picker tap button for the form */
    function formTimeBtn(id, storeKey, val, label) {
      const display = val ? fmtHHMM(val) : 'Tap to set';
      const hasVal  = !!val;
      return `<button type="button" id="${id}"
        style="width:100%;padding:10px 12px;border:none;border-radius:8px;font-size:13px;font-weight:700;
               text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;
               ${hasVal
                 ? 'background:#ede9ff;color:#6c5ce7;box-shadow:3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85);'
                 : 'background:#e4e9f0;color:#95a5a6;box-shadow:inset 2px 2px 5px rgba(163,177,198,.45),inset -2px -2px 5px rgba(255,255,255,.85);'}"
        onclick="empFormTimePick('${storeKey}','${val||''}','${label}')">
        <span id="${id}-text">${display}</span>
        <span style="font-size:10px;color:#b2bec3">›</span>
      </button>`;
    }

    el.innerHTML = `
      <div class="fs">
        <div class="fs-t">💰 Pay Rate</div>
        <div class="fr">
          <div class="fg"><label>Hourly Wage (PKR) *</label>
            <input id="emp-form-wage" type="number" placeholder="0" step="1" min="0" value="${wageVal}"
              oninput="empWorkCalc()">
          </div>
          <div class="fg">
            <label>Duty Hours / Day</label>
            <input id="emp-form-duty-hours" type="number" value="${dutyHours}" min="0.5" max="24" step="0.5"
              oninput="empWorkCalcFromHours()"
              style="font-weight:800;color:#6c5ce7;">
            <div style="font-size:9px;color:#95a5a6;margin-top:3px;">Editing this adjusts Clock Out</div>
          </div>
        </div>
      </div>

      <div class="fs" style="margin-top:10px;">
        <div class="fs-t">🕐 Duty Schedule</div>
        <div class="fr" style="margin-bottom:10px;">
          <div class="fg">
            <label>Duty Start Time</label>
            ${formTimeBtn('emp-btn-duty-start','dutyStart',dutyStart,'Duty Start')}
            <input type="hidden" id="emp-form-duty-start" value="${dutyStart}">
          </div>
          <div class="fg">
            <label>Duty End Time</label>
            ${formTimeBtn('emp-btn-duty-end','dutyEnd',dutyEnd,'Duty End')}
            <input type="hidden" id="emp-form-duty-end" value="${dutyEnd}">
          </div>
        </div>

        <div class="fs-t" style="margin:10px 0 8px;">☕ Default Break</div>
        <div class="fr">
          <div class="fg">
            <label>Break Start Time</label>
            ${formTimeBtn('emp-btn-break-start','breakStart',breakStart,'Break Start')}
            <input type="hidden" id="emp-form-break-start" value="${breakStart}">
          </div>
          <div class="fg">
            <label>Break End Time</label>
            ${formTimeBtn('emp-btn-break-end','breakEnd',breakEnd,'Break End')}
            <input type="hidden" id="emp-form-break-end" value="${breakEnd}">
          </div>
        </div>
        <div class="fg" style="margin-top:4px;">
          <label>Break Duration (auto-calculated or manual)</label>
          <input id="emp-form-default-break" type="number" value="${defaultBreak}" min="0" max="240" step="5"
            placeholder="0 minutes" oninput="empWorkCalc()">
        </div>

        <!-- Live summary -->
        <div id="emp-work-summary" style="margin-top:12px;border-radius:12px;padding:12px 14px;background:#e4e9f0;box-shadow:inset 2px 2px 5px rgba(163,177,198,.45),inset -2px -2px 5px rgba(255,255,255,.85);font-size:12px;">
          <div style="font-weight:700;color:#6c5ce7;margin-bottom:6px;">📊 Schedule Summary</div>
          <div id="emp-work-summary-body" style="color:#636e72;line-height:1.8;"></div>
        </div>
      </div>`;

    /* Run initial calc */
    empWorkCalc();
  }

  // Trigger footer nav state for first render
  const idx     = FORM_STEPS.indexOf(tabName);
  const prevBtn = $('form-prev-btn');
  const nextBtn = $('form-next-btn');
  const saveBtn = $('form-save-btn');
  if (prevBtn) prevBtn.style.display = idx > 0                       ? 'inline-flex' : 'none';
  if (nextBtn) nextBtn.style.display = idx < FORM_STEPS.length - 1   ? 'inline-flex' : 'none';
  if (saveBtn) saveBtn.style.display = idx === FORM_STEPS.length - 1  ? 'inline-flex' : 'none';
}

// Keep old name as alias (used elsewhere)
function renderEmployeeFormSubTabContent() {
  renderFormTab(currentFormSubTab);
}

/* ── Clock picker for Work & Pay form fields ── */
function empFormTimePick(storeKey, currentVal, label) {
  shpTimePicker(null, storeKey, currentVal, label, function(v) {
    /* Store in hidden input */
    var hiddenId = {
      dutyStart:  'emp-form-duty-start',
      dutyEnd:    'emp-form-duty-end',
      breakStart: 'emp-form-break-start',
      breakEnd:   'emp-form-break-end'
    }[storeKey];
    var btnId = {
      dutyStart:  'emp-btn-duty-start',
      dutyEnd:    'emp-btn-duty-end',
      breakStart: 'emp-btn-break-start',
      breakEnd:   'emp-btn-break-end'
    }[storeKey];
    var hidden = document.getElementById(hiddenId);
    if (hidden) hidden.value = v || '';
    /* Update button display */
    var btnText = document.getElementById(btnId + '-text');
    if (btnText) {
      if (!v) {
        btnText.textContent = 'Tap to set';
        var btn = document.getElementById(btnId);
        if (btn) { btn.style.background='#e4e9f0'; btn.style.color='#95a5a6'; btn.style.boxShadow='inset 2px 2px 5px rgba(163,177,198,.45),inset -2px -2px 5px rgba(255,255,255,.85)'; }
      } else {
        /* Format to 12h */
        var p = v.split(':'); var h = parseInt(p[0],10), m = parseInt(p[1],10);
        var ap = h>=12?'PM':'AM'; if(h>12)h-=12; if(h===0)h=12;
        btnText.textContent = h + ':' + String(m).padStart(2,'0') + ' ' + ap;
        var btn = document.getElementById(btnId);
        if (btn) { btn.style.background='#ede9ff'; btn.style.color='#6c5ce7'; btn.style.boxShadow='3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85)'; }
      }
    }
    /* Auto-calc break duration if both break times are set */
    if (storeKey === 'breakStart' || storeKey === 'breakEnd') {
      var bsEl = document.getElementById('emp-form-break-start');
      var beEl = document.getElementById('emp-form-break-end');
      var defBreakEl = document.getElementById('emp-form-default-break');
      if (bsEl && beEl && defBreakEl && bsEl.value && beEl.value) {
        var bs = new Date('1970-01-01T' + bsEl.value);
        var be = new Date('1970-01-01T' + beEl.value);
        if (be <= bs) be = new Date(be.getTime() + 86400000);
        defBreakEl.value = Math.round((be - bs) / 60000);
      }
    }
    /* Recalculate summary */
    empWorkCalc();
  });
}

/* ── When user edits Duty Hours directly: adjust Clock Out ── */
function empWorkCalcFromHours() {
  var hoursEl = document.getElementById('emp-form-duty-hours');
  var startEl = document.getElementById('emp-form-duty-start');
  var endEl   = document.getElementById('emp-form-duty-end');
  var btnEnd  = document.getElementById('emp-btn-duty-end');
  var btnEndTxt = document.getElementById('emp-btn-duty-end-text');
  var breakEl = document.getElementById('emp-form-default-break');
  if (!hoursEl || !startEl || !endEl) { empWorkCalc(); return; }

  var dutyHours = parseFloat(hoursEl.value) || 0;
  var breakMin  = parseInt(breakEl ? breakEl.value : 0, 10) || 0;
  var startVal  = startEl.value || '12:00';
  if (!dutyHours || !startVal) { empWorkCalc(); return; }

  /* New end = start + dutyHours + break */
  var totalMin = dutyHours * 60 + breakMin;
  var sp = startVal.split(':');
  var sMin = parseInt(sp[0],10)*60 + parseInt(sp[1],10);
  var eMin = (sMin + totalMin) % 1440;
  var newEnd = String(Math.floor(eMin/60)).padStart(2,'0') + ':' + String(eMin%60).padStart(2,'0');
  endEl.value = newEnd;

  /* Update the clock-out button display */
  if (btnEndTxt) {
    var ph = parseInt(newEnd.split(':')[0],10), pm = parseInt(newEnd.split(':')[1],10);
    var ap = ph>=12?'PM':'AM'; if(ph>12)ph-=12; if(ph===0)ph=12;
    btnEndTxt.textContent = ph + ':' + String(pm).padStart(2,'0') + ' ' + ap;
    if (btnEnd) { btnEnd.style.background='#ede9ff'; btnEnd.style.color='#6c5ce7'; btnEnd.style.boxShadow='3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85)'; }
  }
  empWorkCalc();
}

/* ── Live schedule calculator shown in Work & Pay tab ── */
function empWorkCalc() {
  var body = document.getElementById('emp-work-summary-body');
  if (!body) return;

  /* Read from hidden inputs (set by clock picker) */
  var startVal  = (document.getElementById('emp-form-duty-start')  || {}).value || '12:00';
  var endVal    = (document.getElementById('emp-form-duty-end')    || {}).value || '00:00';
  var hoursEl   = document.getElementById('emp-form-duty-hours');
  var breakEl   = document.getElementById('emp-form-default-break');
  var wageEl    = document.getElementById('emp-form-wage');
  if (!hoursEl) return;

  var breakMin  = parseInt(breakEl  ? breakEl.value  : 0, 10) || 0;
  var wage      = parseFloat(wageEl ? wageEl.value   : 0) || 0;

  function toMins(t) {
    var p = (t||'00:00').split(':');
    return parseInt(p[0],10)*60 + parseInt(p[1],10);
  }
  var sMin = toMins(startVal);
  var eMin = toMins(endVal);
  /* Overnight */
  var spanMin   = eMin > sMin ? eMin - sMin : (1440 - sMin + eMin);
  var netHours  = (spanMin - breakMin) / 60;
  if (netHours < 0) netHours = 0;

  /* Auto-set duty hours from schedule (don't override if user typed manually) */
  var hoursInput = parseFloat(hoursEl.value) || 0;
  var mismatch   = Math.abs(hoursInput - netHours) > 0.05 && hoursInput > 0;

  /* Format 12h */
  function fmt12(hhmm) {
    var p = (hhmm||'00:00').split(':');
    var h = parseInt(p[0],10), m = parseInt(p[1],10);
    var ap = h>=12?'PM':'AM'; if(h>12)h-=12; if(h===0)h=12;
    return h + ':' + String(m).padStart(2,'0') + ' ' + ap;
  }
  var displayHours = mismatch ? hoursInput : netHours;
  var dailyPay     = Math.round(displayHours * wage);

  var html =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
      '<div>🕐 <strong>Start:</strong> ' + fmt12(startVal) + '</div>' +
      '<div>🏁 <strong>End:</strong> '   + fmt12(endVal)   + '</div>' +
      '<div>☕ <strong>Break:</strong> '  + breakMin + ' min</div>' +
      '<div>⏰ <strong>Hours:</strong> <span style="color:#6c5ce7;font-weight:800">' + displayHours.toFixed(1) + 'h</span></div>' +
      (wage > 0 ? '<div>💰 <strong>Daily Pay:</strong> <span style="color:#00856b;font-weight:800">Rs. ' + dailyPay.toLocaleString('en-PK') + '</span></div>' : '') +
    '</div>' +
    (mismatch ? '<div style="margin-top:8px;padding:8px 10px;background:rgba(231,76,60,.08);border-radius:8px;color:#c0392b;font-size:11px;border:1px solid rgba(231,76,60,.2)">⚠️ Duty Hours (' + hoursInput + 'h) differs from schedule (' + netHours.toFixed(1) + 'h). Edit start/end times or adjust break to match.</div>' : '');

  body.innerHTML = html;
}

/* ══════════════════════════════════════════════════════════════
   STAFF SAVED SUCCESS POPUP
══════════════════════════════════════════════════════════════ */
function showStaffSavedPopup(name, role, isEditing, avatarBg) {
  // Remove any existing popup
  const old = document.getElementById('shp-success-overlay');
  if (old) old.remove();

  // Confetti dots config
  const dots = [
    {left:'18%', top:'30%', bg:'#6c5ce7', delay:'.05s'},
    {left:'75%', top:'25%', bg:'#00b894', delay:'.12s'},
    {left:'50%', top:'18%', bg:'#e84393', delay:'.08s'},
    {left:'30%', top:'50%', bg:'#fdcb6e', delay:'.18s'},
    {left:'80%', top:'55%', bg:'#0984e3', delay:'.06s'},
    {left:'60%', top:'40%', bg:'#a29bfe', delay:'.22s'},
    {left:'22%', top:'65%', bg:'#00cec9', delay:'.15s'},
    {left:'85%', top:'35%', bg:'#fd79a8', delay:'.10s'},
  ];
  const confettiHtml = dots.map(d =>
    `<div class="shp-dot" style="left:${d.left};top:${d.top};background:${d.bg};animation-delay:${d.delay}"></div>`
  ).join('');

  const initial = (name || '?')[0].toUpperCase();
  const roleLabel = role || 'Staff Member';
  const headingText = isEditing ? 'Profile Updated!' : 'New Staff Added!';
  const bodyText = isEditing
    ? `<strong>${name}</strong>'s details have been saved successfully.`
    : `<strong>${name}</strong> has been added to your team.`;

  const overlay = document.createElement('div');
  overlay.id = 'shp-success-overlay';
  overlay.innerHTML = `
    <div id="shp-success-card">
      <div class="shp-confetti">${confettiHtml}</div>

      <div class="shp-check-ring">
        <svg viewBox="0 0 24 24">
          <polyline class="shp-check-path" points="4,13 9,18 20,7"/>
        </svg>
      </div>

      <div class="shp-new-av" style="background:${avatarBg}">${initial}</div>

      <h2>${headingText}</h2>
      <p>${bodyText}</p>

      <div class="shp-role-tag">🏷️ ${roleLabel}</div>

      <button class="shp-goto-btn" onclick="closeStaffSavedPopup()">
        👥 View Staff List
      </button>

      <div class="shp-auto-bar">
        <div class="shp-auto-fill"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Click backdrop to dismiss
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeStaffSavedPopup();
  });

  // Auto-close after 1.2 s (matches bar animation of 1s + small buffer)
  overlay._autoTimer = setTimeout(closeStaffSavedPopup, 1200);
}

function closeStaffSavedPopup() {
  const overlay = document.getElementById('shp-success-overlay');
  if (!overlay) return;
  clearTimeout(overlay._autoTimer);
  overlay.classList.add('shp-out');
  const card = overlay.querySelector('#shp-success-card');
  if (card) card.classList.add('shp-out');
  setTimeout(() => {
    overlay.remove();
    // Navigate to staff list and refresh
    currentEmployeeDetailId = null;
    switchEmployeeModalMainTab('staff');
  }, 300);
}

function saveEmployeeForm() {
  try {
  // Ensure all panels are rendered so we can read their values
  // (user may save from any step without visiting all tabs)
  FORM_STEPS.forEach(step => {
    if (!$(`employee-form-${step}`)?.dataset.rendered) renderFormTab(step);
  });

  const gv = id => { const el = $(id); return el ? el.value.trim() : ''; };
  const name  = gv('emp-form-name');
  const phone = gv('emp-form-phone');
  const wage  = parseFloat($('emp-form-wage')?.value) || 0;

  // ── Validation ────────────────────────────────────────────
  let hasError = false;
  let errorTab = null;

  if (!name) {
    $('emp-form-name')?.classList.add('err');
    hasError = true; errorTab = errorTab || 'profile';
  } else $('emp-form-name')?.classList.remove('err');

  if (!phone) {
    $('emp-form-phone')?.classList.add('err');
    hasError = true; errorTab = errorTab || 'profile';
  } else $('emp-form-phone')?.classList.remove('err');

  if (wage < 0) {
    $('emp-form-wage')?.classList.add('err');
    hasError = true; errorTab = errorTab || 'work';
  } else $('emp-form-wage')?.classList.remove('err');

  if (hasError) {
    // Navigate to the tab that has the error
    if (errorTab && errorTab !== currentFormSubTab) {
      const tabBtn = $(`form-tab-${errorTab}`);
      switchEmployeeFormSubTab(errorTab, tabBtn);
    }
    showToast('Please fill all required fields.', 'err');
    const saveBtn = $('form-save-btn');
    if (saveBtn) { saveBtn.style.animation = 'none'; saveBtn.offsetHeight; saveBtn.style.animation = 'shpShake .4s ease'; }
    return;
  }

  // ── Collect all data ───────────────────────────────────────
  const role = gv('emp-form-role');
  const empData = {
    name, phone, role,
    idCard           : gv('emp-form-id-card'),
    joinDate         : $('emp-form-join-date')?.value || '',
    address          : gv('emp-form-address'),
    wage,
    dutyHours        : parseFloat($('emp-form-duty-hours')?.value)      || 12,
    dutyStart        : $('emp-form-duty-start')?.value                  || '12:00',
    dutyEnd          : $('emp-form-duty-end')?.value                    || '00:00',
    breakStart       : $('emp-form-break-start')?.value                 || '',
    breakEnd         : $('emp-form-break-end')?.value                   || '',
    defaultBreak     : parseInt($('emp-form-default-break')?.value, 10) || 0,
    relativeName     : gv('emp-form-relative-name'),
    relativePhone    : gv('emp-form-relative-phone'),
    relativeRelation : gv('emp-form-relative-relation'),
    relativeAddress  : gv('emp-form-relative-address')
  };

  const isEditing = !!currentEmployeeDetailId;
  const avatarBg  = getAvatarColor(name);

  if (isEditing) updateEmployee(currentEmployeeDetailId, empData);
  else           addEmployee(empData);

  // ── Animated success popup ─────────────────────────────────
  showStaffSavedPopup(name, role, isEditing, avatarBg);
  } catch(e) {
    console.error('[employee_ui] saveEmployeeForm crashed:', e);
    showToast('Save failed — please try again.', 'err');
  }
}

function deleteStaff(id) {
  const emp = app.employees.find(e => e.id === id);
  showConfirm('Delete Employee?', `Are you sure you want to permanently remove "${emp?.name || 'this employee'}"? This action cannot be undone.`, '🗑️', 'Delete', () => {
    deleteEmployee(id);
    showToast('Employee deleted successfully!', 'inf');
    if (currentEmployeeDetailId === id) {
      currentEmployeeDetailId = null;
    }
    // After deletion, always go back to staff list and re-render everything
    switchEmployeeModalMainTab('staff');
  });
}

// ========== EMPLOYEE DETAIL SUB-TABS (PROFILE, LEDGER, CALENDAR, SALARY) ==========

function renderEmployeeProfileTab(emp) {
  $('employee-detail-profile').innerHTML = `
    <div class="pgrid">
      <div class="icard"><div class="ic-h">👤 Personal Info</div><div class="ic-r">
        <div><div class="ic-rl">Full Name</div><div class="ic-rv">${emp.name || '—'}</div></div>
        <div><div class="ic-rl">Phone Number</div><div class="ic-rv">${emp.phone || '—'}</div></div>
        <div><div class="ic-rl">ID Card Number</div><div class="ic-rv">${emp.idCard || '—'}</div></div>
        <div><div class="ic-rl">Role / Position</div><div class="ic-rv">${emp.role || '—'}</div></div>
        <div><div class="ic-rl">Address</div><div class="ic-rv">${emp.address || '—'}</div></div>
        <div><div class="ic-rl">Join Date</div><div class="ic-rv">${emp.joinDate ? formatDateShort(emp.joinDate) : '—'}</div></div>
      </div></div>
      <div class="icard"><div class="ic-h">🚨 Emergency Contact</div><div class="ic-r">
        <div><div class="ic-rl">Contact Name</div><div class="ic-rv">${emp.relativeName || '—'}</div></div>
        <div><div class="ic-rl">Contact Phone</div><div class="ic-rv">${emp.relativePhone || '—'}</div></div>
        <div><div class="ic-rl">Relationship</div><div class="ic-rv">${emp.relativeRelation || '—'}</div></div>
        <div><div class="ic-rl">Address</div><div class="ic-rv">${emp.relativeAddress || '—'}</div></div>
      </div></div>
      <div class="icard"><div class="ic-h">📊 Work & Pay</div><div class="ic-r">
        <div><div class="ic-rl">Hourly Wage</div><div class="ic-rv amp">${formatCurrency(emp.wage || 0)}/hr</div></div>
        <div><div class="ic-rl">Daily Duty Hours</div><div class="ic-rv">${emp.dutyHours || 12}h</div></div>
        <div><div class="ic-rl">Duty Start</div><div class="ic-rv">${emp.dutyStart || '12:00 PM'}</div></div>
        <div><div class="ic-rl">Duty End</div><div class="ic-rv">${emp.dutyEnd || '12:00 AM'}</div></div>
        <div><div class="ic-rl">Default Break</div><div class="ic-rv">${emp.defaultBreak || 0} min</div></div>
      </div></div>
    </div>
  `;
}

function renderEmployeeLedgerTab(emp) {
  const ledger = emp.ledger || [];
  const cashIn = ledger.filter(t => t.type === 'cash_in').reduce((s, t) => s + t.amount, 0);
  const cashOut = ledger.filter(t => t.type === 'cash_out').reduce((s, t) => s + t.amount, 0);
  const balance = cashIn - cashOut;

  let sortedLedger = [...ledger].sort((a, b) => {
    const dateA = new Date(a.date + 'T' + (a.time || '00:00:00'));
    const dateB = new Date(b.date + 'T' + (b.time || '00:00:00'));
    return dateB - dateA; // Newest first
  });

  $('employee-detail-ledger').innerHTML = `
    <div class="tcard" style="margin-bottom:14px;">
        <div class="tc-top">
            <h4 style="color:var(--text-primary);">💰 Cash Ledger</h4>
            <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
                <button class="btn-new-item" onclick="openAddTransactionModal('${emp.id}')">➕ Add Transaction</button>
            </div>
        </div>
        <div class="ls">
            <div class="ls-i"><div class="lv amp" style="color:var(--col-success);">${formatCurrency(cashIn)}</div><div class="ll">Cash In</div></div>
            <div class="ls-i"><div class="lv amn" style="color:var(--col-danger);">${formatCurrency(cashOut)}</div><div class="ll">Cash Out</div></div>
            <div class="ls-i"><div class="lv ${balance >= 0 ? 'amp' : 'amn'}" style="color:${balance >= 0 ? 'var(--col-success)' : 'var(--col-danger)'}">${formatCurrency(balance)}</div><div class="ll">Balance</div></div>
        </div>
        ${sortedLedger.length ? `
        <div class="tw" style="max-height: 400px; overflow-y: auto;">
            <table>
                <thead>
                    <tr><th>Date</th><th>Type</th><th>Amount</th><th>Reason</th><th>Where</th><th>Note</th><th></th></tr>
                </thead>
                <tbody>
                    ${sortedLedger.map(tx => `
                        <tr>
                            <td style="color:var(--text-primary);">${formatDateShort(tx.date)}</td>
                            <td><span class="badge ${tx.type === 'cash_in' ? 'b-in' : 'b-out'}">${tx.type === 'cash_in' ? '↗In' : '↙Out'}</span></td>
                            <td class="${tx.type === 'cash_in' ? 'amp' : 'amn'}" style="font-weight:700">${tx.type === 'cash_in' ? '+' : '-'}${formatCurrency(tx.amount)}</td>
                            <td style="color:var(--text-primary);">${tx.reason || '—'}</td>
                            <td style="color:var(--text-primary);">${tx.where || '—'}</td>
                            <td style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; color:var(--text-primary);">${tx.note || '—'}</td>
                            <td><button class="bic" style="width:22px;height:22px;font-size:9px" onclick="deleteTransaction('${emp.id}', '${tx.entryId}')">🗑️</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>` : `<div class="empty"><div class="ei" style="color: var(--text-secondary);">💰</div><h3 style="color:var(--text-primary);">No Transactions</h3><p style="color: var(--text-secondary);">Add the first transaction</p></div>`}
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════════
   BEAUTIFUL TRANSACTION MODAL — StaffHub Pro style
   Injected dynamically so it never depends on index.html styling
══════════════════════════════════════════════════════════════ */
function openAddTransactionModal(employeeId) {
  currentEmployeeDetailId = employeeId;
  const emp = app.employees.find(e => e.id === employeeId);

  // Remove old modal if exists
  const oldModal = document.getElementById('shp-tx-modal');
  if (oldModal) oldModal.remove();

  // ── Inject CSS once ───────────────────────────────────────
  if (!document.getElementById('shp-tx-css')) {
    const s = document.createElement('style');
    s.id = 'shp-tx-css';
    s.textContent = `
/* ── SHP Transaction Modal ── */
#shp-tx-overlay {
  position:fixed; inset:0; z-index:99998;
  background:rgba(163,177,198,.5);
  backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
  display:flex; align-items:center; justify-content:center;
  padding:16px; animation:shpTxOvIn .2s ease both;
}
@keyframes shpTxOvIn{from{opacity:0}to{opacity:1}}
#shp-tx-overlay.shp-tx-out{animation:shpTxOvOut .18s ease both}
@keyframes shpTxOvOut{from{opacity:1}to{opacity:0}}
#shp-tx-card {
  background:#e8ecf2;
  border-radius:20px;
  width:100%; max-width:420px;
  max-height:92vh; overflow-y:auto;
  box-shadow:14px 14px 30px rgba(163,177,198,.6),-14px -14px 30px rgba(255,255,255,.9);
  animation:shpTxCardIn .25s cubic-bezier(.175,.885,.32,1.275) both;
}
@keyframes shpTxCardIn{from{opacity:0;transform:scale(.9) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
#shp-tx-card.shp-tx-out{animation:shpTxCardOut .18s ease both}
@keyframes shpTxCardOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.95)}}

/* Header */
.shp-tx-hd {
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 20px 14px;
  border-bottom:1px solid rgba(163,177,198,.25);
}
.shp-tx-hd-left { display:flex; align-items:center; gap:10px; }
.shp-tx-hd-icon {
  width:40px; height:40px; border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  font-size:18px;
  box-shadow:3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85);
}
.shp-tx-hd h3 { font-size:16px; font-weight:800; color:#2d3436; margin:0; }
.shp-tx-hd p  { font-size:10px; color:#95a5a6; margin:2px 0 0; }
.shp-tx-close {
  width:32px; height:32px; border:none; border-radius:9px;
  background:#e4e9f0; color:#636e72; cursor:pointer; font-size:14px;
  display:flex; align-items:center; justify-content:center;
  box-shadow:2px 2px 5px rgba(163,177,198,.5),-2px -2px 5px rgba(255,255,255,.85);
  transition:all .2s; flex-shrink:0;
}
.shp-tx-close:hover { background:#e74c3c; color:#fff; }

/* Type toggle */
.shp-tx-type-row {
  display:grid; grid-template-columns:1fr 1fr;
  gap:10px; padding:16px 20px 10px;
}
.shp-tx-type-btn {
  padding:12px 8px; border:none; border-radius:12px;
  cursor:pointer; font-size:12px; font-weight:700;
  display:flex; align-items:center; justify-content:center; gap:6px;
  transition:all .22s; background:#e4e9f0;
  color:#636e72;
  box-shadow:3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85);
}
.shp-tx-type-btn:hover { transform:translateY(-1px); }
.shp-tx-type-btn:active { box-shadow:inset 2px 2px 5px rgba(163,177,198,.5),inset -2px -2px 5px rgba(255,255,255,.85); transform:none; }
.shp-tx-type-btn.in-on  {
  background:linear-gradient(135deg,#00b894,#00cec9); color:#fff;
  box-shadow:4px 4px 14px rgba(0,184,148,.4),-2px -2px 8px rgba(255,255,255,.7);
}
.shp-tx-type-btn.out-on {
  background:linear-gradient(135deg,#e74c3c,#fd79a8); color:#fff;
  box-shadow:4px 4px 14px rgba(231,76,60,.35),-2px -2px 8px rgba(255,255,255,.7);
}

/* Amount hero */
.shp-tx-amount-wrap {
  margin:0 20px 14px;
  background:#e4e9f0;
  border-radius:14px;
  padding:14px 16px;
  box-shadow:inset 3px 3px 7px rgba(163,177,198,.5),inset -3px -3px 7px rgba(255,255,255,.85);
  display:flex; align-items:center; gap:10px;
}
.shp-tx-currency {
  font-size:16px; font-weight:800; color:#95a5a6; flex-shrink:0;
}
#shp-tx-amount {
  flex:1; background:transparent; border:none; outline:none;
  font-size:28px; font-weight:800; color:#2d3436;
  font-family:inherit; width:100%; min-width:0;
}
#shp-tx-amount::placeholder { color:#b2bec3; }

/* Fields */
.shp-tx-body { padding:0 20px 8px; display:flex; flex-direction:column; gap:10px; }
.shp-tx-field { display:flex; flex-direction:column; gap:4px; }
.shp-tx-field label {
  font-size:9px; font-weight:700; color:#95a5a6;
  text-transform:uppercase; letter-spacing:.8px;
}
.shp-tx-field input,
.shp-tx-field select,
.shp-tx-field textarea {
  padding:10px 12px; background:#e4e9f0; border:none;
  border-radius:10px; color:#2d3436; font-size:13px;
  font-family:inherit; transition:all .2s;
  box-shadow:inset 2px 2px 5px rgba(163,177,198,.45),inset -2px -2px 5px rgba(255,255,255,.85);
  width:100%;
}
.shp-tx-field input:focus,
.shp-tx-field select:focus,
.shp-tx-field textarea:focus {
  outline:none;
  box-shadow:inset 3px 3px 7px rgba(163,177,198,.5),inset -3px -3px 7px rgba(255,255,255,.85),
             0 0 0 2px rgba(108,92,231,.3);
}
.shp-tx-field input.shp-err,
.shp-tx-field select.shp-err {
  box-shadow:inset 2px 2px 5px rgba(163,177,198,.45),inset -2px -2px 5px rgba(255,255,255,.85),
             0 0 0 2px rgba(231,76,60,.4);
}
.shp-tx-field textarea { resize:none; min-height:58px; }
.shp-tx-field select { -webkit-appearance:none; appearance:none; cursor:pointer; }
.shp-tx-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

/* Footer */
.shp-tx-footer {
  display:flex; gap:10px; padding:14px 20px 20px; align-items:center;
}
.shp-tx-cancel {
  padding:12px 18px; border:none; border-radius:12px;
  background:#e4e9f0; color:#636e72; font-size:13px; font-weight:600;
  cursor:pointer; transition:all .2s;
  box-shadow:3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85);
}
.shp-tx-cancel:hover { color:#2d3436; }
.shp-tx-cancel:active { box-shadow:inset 2px 2px 5px rgba(163,177,198,.5),inset -2px -2px 5px rgba(255,255,255,.85); }
.shp-tx-save {
  flex:1; padding:13px; border:none; border-radius:12px;
  font-size:14px; font-weight:700; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:7px;
  transition:all .2s;
  background:linear-gradient(135deg,#6c5ce7,#a29bfe); color:#fff;
  box-shadow:4px 4px 14px rgba(108,92,231,.4),-3px -3px 10px rgba(255,255,255,.7);
}
.shp-tx-save:hover { transform:translateY(-2px); box-shadow:5px 5px 18px rgba(108,92,231,.45); }
.shp-tx-save:active { transform:none; box-shadow:inset 2px 2px 5px rgba(90,75,180,.3); }
.shp-tx-save.in-save  { background:linear-gradient(135deg,#00b894,#00cec9); box-shadow:4px 4px 14px rgba(0,184,148,.4),-3px -3px 10px rgba(255,255,255,.7); }
.shp-tx-save.in-save:hover { box-shadow:5px 5px 18px rgba(0,184,148,.45); }
.shp-tx-save.out-save { background:linear-gradient(135deg,#e74c3c,#fd79a8); box-shadow:4px 4px 14px rgba(231,76,60,.35),-3px -3px 10px rgba(255,255,255,.7); }
.shp-tx-save.out-save:hover { box-shadow:5px 5px 18px rgba(231,76,60,.4); }

@media(max-width:480px){
  #shp-tx-card { border-radius:20px 20px 0 0; position:fixed; bottom:0; left:0; right:0; max-width:100%; margin:0; max-height:88vh; }
  #shp-tx-overlay { align-items:flex-end; padding:0; }
  @keyframes shpTxCardIn{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
}
    `;
    document.head.appendChild(s);
  }

  const today = getTodayDateString();
  const empName = emp ? emp.name : 'Staff';

  // ── Build modal DOM ────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'shp-tx-overlay';
  overlay.innerHTML = `
    <div id="shp-tx-card" id="shp-tx-modal">

      <!-- Header -->
      <div class="shp-tx-hd">
        <div class="shp-tx-hd-left">
          <div class="shp-tx-hd-icon" id="shp-tx-hd-icon" style="background:linear-gradient(135deg,#00b894,#00cec9);">💵</div>
          <div>
            <h3 id="shp-tx-hd-title">Cash In</h3>
            <p>${empName}</p>
          </div>
        </div>
        <button class="shp-tx-close" onclick="closeTransactionModal()">✕</button>
      </div>

      <!-- Type Toggle -->
      <div class="shp-tx-type-row">
        <button class="shp-tx-type-btn in-on" id="shp-btn-in" onclick="shpTxSetType('cash_in')">
          💵 Cash In
        </button>
        <button class="shp-tx-type-btn" id="shp-btn-out" onclick="shpTxSetType('cash_out')">
          💸 Cash Out
        </button>
      </div>

      <!-- Amount -->
      <div class="shp-tx-amount-wrap">
        <span class="shp-tx-currency">Rs.</span>
        <input id="shp-tx-amount" type="number" placeholder="0" min="0" step="1" inputmode="numeric">
      </div>

      <!-- Fields -->
      <div class="shp-tx-body">
        <div class="shp-tx-row">
          <div class="shp-tx-field">
            <label>Date *</label>
            <input id="shp-tx-date" type="date" value="${today}">
          </div>
          <div class="shp-tx-field">
            <label>Where / Whom</label>
            <input id="shp-tx-where" type="text" placeholder="Person or place">
          </div>
        </div>
        <div class="shp-tx-field">
          <label>Reason *</label>
          <input id="shp-tx-reason" type="text" placeholder="Purpose of this transaction...">
        </div>
        <div class="shp-tx-field">
          <label>Note</label>
          <textarea id="shp-tx-note" placeholder="Additional details..."></textarea>
        </div>
      </div>

      <!-- Footer -->
      <div class="shp-tx-footer">
        <button class="shp-tx-cancel" onclick="closeTransactionModal()">Cancel</button>
        <button class="shp-tx-save in-save" id="shp-tx-save-btn" onclick="saveTransactionNew()">
          💾 Save Transaction
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  // Tap backdrop to close
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeTransactionModal();
  });

  // Focus amount after open animation
  setTimeout(function(){ const a = document.getElementById('shp-tx-amount'); if(a) a.focus(); }, 280);
}

/* Set transaction type & update UI colours */
function shpTxSetType(type) {
  const isIn = type === 'cash_in';
  const btnIn  = document.getElementById('shp-btn-in');
  const btnOut = document.getElementById('shp-btn-out');
  const icon   = document.getElementById('shp-tx-hd-icon');
  const title  = document.getElementById('shp-tx-hd-title');
  const save   = document.getElementById('shp-tx-save-btn');

  if (btnIn)  { btnIn.className  = 'shp-tx-type-btn' + (isIn  ? ' in-on'  : ''); }
  if (btnOut) { btnOut.className = 'shp-tx-type-btn' + (!isIn ? ' out-on' : ''); }
  if (icon)   { icon.style.background  = isIn ? 'linear-gradient(135deg,#00b894,#00cec9)' : 'linear-gradient(135deg,#e74c3c,#fd79a8)'; icon.textContent = isIn ? '💵' : '💸'; }
  if (title)  { title.textContent = isIn ? 'Cash In' : 'Cash Out'; }
  if (save)   { save.className = 'shp-tx-save ' + (isIn ? 'in-save' : 'out-save'); }

  // Store type in a data attribute on the card
  const card = document.getElementById('shp-tx-card');
  if (card) card.dataset.txType = type;
}

function closeTransactionModal() {
  const overlay = document.getElementById('shp-tx-overlay');
  if (!overlay) return;
  overlay.classList.add('shp-tx-out');
  const card = document.getElementById('shp-tx-card');
  if (card) card.classList.add('shp-tx-out');
  setTimeout(function(){ if(overlay.parentNode) overlay.remove(); }, 200);
}

function saveTransactionNew() {
  const employeeId = currentEmployeeDetailId;
  if (!employeeId) { showToast('No employee selected.', 'err'); return; }

  const card   = document.getElementById('shp-tx-card');
  const type   = (card && card.dataset.txType) || 'cash_in';
  const amount = parseFloat((document.getElementById('shp-tx-amount') || {}).value || '0');
  const date   = (document.getElementById('shp-tx-date')   || {}).value || '';
  const reason = ((document.getElementById('shp-tx-reason') || {}).value || '').trim();
  const where  = ((document.getElementById('shp-tx-where')  || {}).value || '').trim();
  const note   = ((document.getElementById('shp-tx-note')   || {}).value || '').trim();

  // Validation with field highlight
  let hasError = false;
  const amtEl    = document.getElementById('shp-tx-amount');
  const reasonEl = document.getElementById('shp-tx-reason');
  const dateEl   = document.getElementById('shp-tx-date');

  if (!amount || amount <= 0) { if(amtEl) amtEl.classList.add('shp-err');    hasError = true; } else { if(amtEl) amtEl.classList.remove('shp-err'); }
  if (!reason)                { if(reasonEl) reasonEl.classList.add('shp-err'); hasError = true; } else { if(reasonEl) reasonEl.classList.remove('shp-err'); }
  if (!date)                  { if(dateEl) dateEl.classList.add('shp-err');    hasError = true; } else { if(dateEl) dateEl.classList.remove('shp-err'); }

  if (hasError) {
    showToast('Amount and Reason are required.', 'err');
    // Shake save btn
    const btn = document.getElementById('shp-tx-save-btn');
    if (btn) { btn.style.animation='none'; btn.offsetHeight; btn.style.animation='shpShake .4s ease'; }
    return;
  }

  addCashTransaction(employeeId, { type, amount, date, reason, where, note });
  closeTransactionModal();
  showToast((type === 'cash_in' ? '💵 Cash In' : '💸 Cash Out') + ' — Rs. ' + Math.round(amount).toLocaleString('en-PK') + ' saved!', 'ok');

  // Refresh ledger and dashboard
  const emp = app.employees.find(e => e.id === employeeId);
  if (emp) {
    if (typeof renderEmployeeLedgerTab === 'function') renderEmployeeLedgerTab(emp);
    if (typeof renderEmployeeDetailHero === 'function') renderEmployeeDetailHero(emp);
  }
  const mainContent = document.getElementById('employee-modal-main-content');
  if (mainContent && typeof renderDashboardContent === 'function') renderDashboardContent(mainContent);
}

function deleteTransaction(employeeId, entryId) {
  showConfirm('Delete Transaction?', 'Are you sure you want to delete this transaction?', '💰', 'Delete', () => {
    const result = deleteCashLedgerEntry(employeeId, entryId);
    if (result.success) {
      showToast(result.message, 'inf');
      renderEmployeeLedgerTab(app.employees.find(e => e.id === employeeId)); 
      renderEmployeeDetailHero(app.employees.find(e => e.id === employeeId)); 
      renderDashboardContent($('employee-modal-main-content')); 
    } else {
      showToast(result.message, 'err');
    }
  });
}

function renderEmployeeCalendarTab(emp) {
  const y = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = new Date(y, m, 1).getDay(); // 0 for Sunday, 6 for Saturday

  const empAttendance = emp.attendance || [];
  const monthAttendanceMap = new Map();
  empAttendance.filter(a => new Date(a.date).getFullYear() === y && new Date(a.date).getMonth() === m)
               .forEach(a => monthAttendanceMap.set(a.date, a));

  const todayDateString = getTodayDateString();

  let calendarDaysHtml = '';
  // Empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDaysHtml += `<div></div>`;
  }

  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const att = monthAttendanceMap.get(dateStr);
    const isToday = dateStr === todayDateString;

    let statusChar = '—';
    let bgColor = '#e4e9f0';
    let textColor = '#2d3436';
    let shadow = 'inset 2px 2px 4px rgba(163,177,198,.5),inset -2px -2px 4px rgba(255,255,255,.85)';

    if (att) {
      if (att.status === 'present') { statusChar = '✅'; bgColor = 'rgba(0,184,148,.08)';       textColor = '#00856b'; shadow = '3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85)'; }
      else if (att.status === 'half')  { statusChar = '½';  bgColor = 'rgba(0,206,201,.07)';       textColor = '#009e99'; shadow = '3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85)'; }
      else if (att.status === 'absent'){ statusChar = '❌'; bgColor = 'rgba(231,76,60,.07)';        textColor = '#c0392b'; shadow = '3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85)'; }
      else if (att.status === 'sick')  { statusChar = '🤒'; bgColor = 'rgba(243,156,18,.07)';       textColor = '#c47f17'; shadow = '3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85)'; }
      else if (att.status === 'leave') { statusChar = '🏖️'; bgColor = 'rgba(52,152,219,.07)';       textColor = '#2471a3'; shadow = '3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85)'; }
      else if (att.status === 'off')   { statusChar = '📴'; bgColor = '#e4e9f0'; textColor = '#636e72'; shadow = '3px 3px 8px rgba(163,177,198,.5),-3px -3px 8px rgba(255,255,255,.85)'; }
    }
    
    // Day of the week name
    const dateObj = new Date(dateStr + 'T12:00:00'); // Add T12:00:00 to avoid timezone issues
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    calendarDaysHtml += `
      <div style="background:${bgColor};border-radius:var(--radius-main);padding:8px;text-align:center;box-shadow:${shadow}; ${isToday ? 'border:2px solid var(--col-primary);' : ''}">
        <div style="font-size:8px;color:var(--text-secondary);margin-bottom:2px;">${dayName}</div>
        <div style="font-size:16px;font-weight:800;margin:2px 0; color: ${textColor}">${d}</div>
        <div style="font-size:8px;font-weight:700;color:${textColor}">${statusChar}</div>
        ${att && ['present', 'half'].includes(att.status) ? `<div style="font-size:9px;color:var(--text-primary);">${att.hours || 0}h</div>` : ''}
        ${att?.pay ? `<div style="font-size:8px;color:var(--text-secondary)">${formatCurrency(att.pay)}</div>` : ''}
      </div>
    `;
  }

  $('employee-detail-calendar').innerHTML = `
    <div class="tcard">
      <div class="tc-top">
        <h4 style="color:var(--text-primary);;">📅 Attendance Calendar</h4>
        <div class="mn">
          <button onclick="changeCalendarMonth(-1)">◀</button>
          <span>${formatMonthYear(calendarMonth)}</span>
          <button onclick="changeCalendarMonth(1)">▶</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:14px">
        ${calendarDaysHtml}
      </div>
    </div>
  `;
}

function changeCalendarMonth(delta) {
  calendarMonth.setMonth(calendarMonth.getMonth() + delta);
  renderEmployeeCalendarTab(app.employees.find(e => e.id === currentEmployeeDetailId));
}

function renderEmployeeSalaryTab(emp) {
  const y = salaryMonth.getFullYear();
  const m = salaryMonth.getMonth(); // 0-indexed
  
  const empAttendance = emp.attendance || [];
  const monthAttendance = empAttendance.filter(a => new Date(a.date).getFullYear() === y && new Date(a.date).getMonth() === m);

  let totalHours = 0;
  let totalPay = 0;
  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let sickDays = 0;
  let leaveDays = 0;
  
  monthAttendance.forEach(att => {
    if (att.status === 'present') { presentDays++; totalHours += (att.hours || 0); totalPay += (att.pay || 0); }
    else if (att.status === 'half') { halfDays++; totalHours += (att.hours || 0); totalPay += (att.pay || 0); }
    else if (att.status === 'absent') absentDays++;
    else if (att.status === 'sick') sickDays++;
    else if (att.status === 'leave') leaveDays++;
  });

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const allDatesInMonth = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

  let rowsHtml = '';
  allDatesInMonth.forEach(dateStr => {
    const att = monthAttendance.find(a => a.date === dateStr);
    const dateObj = new Date(dateStr + 'T12:00:00');
    const dayOfMonth = dateObj.getDate();
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    let statusDisplay = '<span class="badge b-unmarked">— Unmarked</span>';
    let hoursDisplay = '—';
    let payDisplay = '—';
    let noteDisplay = '—';

    if (att) {
      statusDisplay = `<span class="badge b-${att.status}">${att.status.charAt(0).toUpperCase() + att.status.slice(1)}</span>`;
      if (['present', 'half'].includes(att.status)) {
        hoursDisplay = `${(att.hours || 0).toFixed(1)}h`;
        payDisplay = formatCurrency(att.pay || 0);
      }
      noteDisplay = att.note || '—';
    }

    rowsHtml += `
      <tr>
        <td style="font-weight:700; color:var(--text-primary);">${dayOfMonth}</td>
        <td style="color:var(--text-primary);">${dayOfWeek}</td>
        <td>${statusDisplay}</td>
        <td style="color:var(--text-primary);">${hoursDisplay}</td>
        <td style="font-weight:600; color:var(--text-primary);">${payDisplay}</td>
        <td style="font-size:9px;color:var(--text-secondary);">${noteDisplay}</td>
      </tr>
    `;
  });


  $('employee-detail-salary').innerHTML = `
    <div class="tcard">
      <div class="tc-top">
        <h4 style="color:var(--text-primary);;">💵 Monthly Salary Summary</h4>
        <div class="mn">
          <button onclick="changeSalaryMonth(-1)">◀</button>
          <span>${formatMonthYear(salaryMonth)}</span>
          <button onclick="changeSalaryMonth(1)">▶</button>
        </div>
      </div>
      <div class="sal-g">
        <div class="sal-c"><div class="sl">Rate</div><div class="sv" style="color:#6c5ce7">${formatCurrency(emp.wage || 0)}/hr</div></div>
        <div class="sal-c"><div class="sl">Total Hours</div><div class="sv">${totalHours.toFixed(1)}h</div></div>
        <div class="sal-c"><div class="sl">Present Days</div><div class="sv amp">${presentDays}d</div></div>
        <div class="sal-c"><div class="sl">Half Days</div><div class="sv" style="color:#009e99">${halfDays}d</div></div>
        <div class="sal-c"><div class="sl">Absent Days</div><div class="sv amn">${absentDays}d</div></div>
        <div class="sal-c"><div class="sl">Sick Days</div><div class="sv" style="color:#c47f17">${sickDays}d</div></div>
        <div class="sal-c"><div class="sl">Leave Days</div><div class="sv" style="color:#2471a3">${leaveDays}d</div></div>
        <div class="sal-c sal-tot"><div class="sl">💰 Total Pay</div><div class="sv amp">${formatCurrency(totalPay)}</div></div>
      </div>
      <div class="tw" style="max-height: 400px; overflow-y: auto;">
        <table>
          <thead>
            <tr><th>Day</th><th></th><th>Status</th><th>Hours</th><th>Pay</th><th>Note</th></tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="background:#dfe4ec;font-weight:700;">
              <td colspan="3" style="text-align:right;font-weight:800;font-size:12px">TOTAL</td>
              <td style="font-weight:800">${totalHours.toFixed(1)}h</td>
              <td style="font-weight:800;color:#00856b">${formatCurrency(totalPay)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function changeSalaryMonth(delta) {
  salaryMonth.setMonth(salaryMonth.getMonth() + delta);
  renderEmployeeSalaryTab(app.employees.find(e => e.id === currentEmployeeDetailId));
}

// ========== MASTER ATTENDANCE SHEET LOGIC ==========

/* Helper: format date nicely for display */
function formatAttendanceDateDisplay(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday:'short', month:'short', day:'numeric', year:'numeric'
  });
}

// attendanceFlatpickrInstance lives on window (declared at top)
function initializeFlatpickrs() {
  // ── Attendance sheet date picker ──────────────────────────
  const attInput = $('attendance-sheet-date');
  if (attInput) {
    if (attendanceFlatpickrInstance) { attendanceFlatpickrInstance.destroy(); attendanceFlatpickrInstance = null; }
    // Set the visible formatted text value immediately
    attInput.value = formatAttendanceDateDisplay(currentAttendanceDate);
    attendanceFlatpickrInstance = flatpickr(attInput, {
      dateFormat   : 'Y-m-d',
      defaultDate  : currentAttendanceDate,
      disableMobile: false,
      onReady(_, __, fp) {
        // After flatpickr is ready, force the display value
        fp.input.value = formatAttendanceDateDisplay(currentAttendanceDate);
      },
      onChange(selectedDates, dateStr) {
        if (!selectedDates.length) return;
        // Show nice format in the input
        fp.input.value = formatAttendanceDateDisplay(dateStr);
        const change = () => {
          currentAttendanceDate = dateStr;
          loadPendingAttendanceForDate();
          renderAttendanceSheet();
        };
        if (hasUnsavedAttendanceChanges) {
          showConfirm('Unsaved Changes','Discard and change date?','⚠️','Discard', () => {
            hasUnsavedAttendanceChanges = false; change();
          });
        } else { change(); }
      }
    });
    // Keep the variable accessible in callbacks above
    const fp = attendanceFlatpickrInstance;
  }

  // ── Transaction date picker ───────────────────────────────
  const txInput = $('tx-date');
  if (txInput) {
    const existing = txInput._flatpickr;
    if (existing) existing.destroy();
    flatpickr(txInput, { dateFormat: 'Y-m-d', defaultDate: getTodayDateString() });
  }
}


function loadPendingAttendanceForDate() {
  currentAttendancePendingChanges = {};
  hasUnsavedAttendanceChanges = false; // Reset unsaved changes flag
  app.employees.forEach(emp => {
    const existingAttendance = emp.attendance?.find(a => a.date === currentAttendanceDate);
    // Deep copy to allow independent modifications
    if (existingAttendance) {
      currentAttendancePendingChanges[emp.id] = JSON.parse(JSON.stringify(existingAttendance));
    } else {
      // Initialize a default pending record if none exists for the date
      currentAttendancePendingChanges[emp.id] = {
        // We use emp.id as part of the pending ID to link it back to the employee
        id: 'PENDING-ATT-' + emp.id + '-' + Date.now().toString(36).substr(2, 5), 
        date: currentAttendanceDate,
        status: '', // Unmarked by default
        clock_in: null, clock_out: null, break_start: null, break_end: null,
        total_break: 0, regular_hours: 0, overtime_hours: 0, hours: 0, pay: 0, note: '',
        manual_override: false
      };
    }
  });
  updateAttendanceSheetSaveButton();
}

function updateAttendanceSheetSaveButton() {
  const btn = $('save-attendance-btn');
  const badge = $('attendance-unsaved-badge');
  if (btn) btn.toggleAttribute('disabled', !hasUnsavedAttendanceChanges);
  if (badge) badge.style.display = hasUnsavedAttendanceChanges ? 'inline-flex' : 'none';
}

function changeAttendanceDate(delta) {
  if (hasUnsavedAttendanceChanges) {
    showConfirm('Unsaved Changes', 'You have unsaved changes. Discard and change date?', '⚠️', 'Discard', () => {
      hasUnsavedAttendanceChanges = false;
      _changeAttendanceDate(delta);
    });
  } else {
    _changeAttendanceDate(delta);
  }
}

function _changeAttendanceDate(delta) {
  const date = new Date(currentAttendanceDate + 'T12:00:00');
  date.setDate(date.getDate() + delta);
  currentAttendanceDate = date.toISOString().split('T')[0];
  // Update displayed value immediately
  const attInput = $('attendance-sheet-date');
  if (attInput) attInput.value = formatAttendanceDateDisplay(currentAttendanceDate);
  if (attendanceFlatpickrInstance) attendanceFlatpickrInstance.setDate(currentAttendanceDate, false);
  loadPendingAttendanceForDate();
  renderAttendanceSheet();
}

function renderAttendanceSheet() {
  const container = $('attendance-table-body');
  if (!container) return;

  // ── Always keep the date input text current ──────────────
  const attInput = $('attendance-sheet-date');
  if (attInput) attInput.value = formatAttendanceDateDisplay(currentAttendanceDate);
  if (attendanceFlatpickrInstance) attendanceFlatpickrInstance.setDate(currentAttendanceDate, false);

  let totalHours = 0, totalPay = 0, presentCount = 0, halfCount = 0, absentCount = 0, sickCount = 0, leaveCount = 0;

  const sortedEmployees = [...app.employees].sort((a, b) => a.name.localeCompare(b.name));
  
  let rowsHtml = '';
  if (sortedEmployees.length === 0) {
    rowsHtml = `<tr><td colspan="11" class="empty" style="padding:10px;"><div class="ei" style="font-size:24px; color: var(--text-secondary);">👥</div><h3 style="font-size:12px; color: var(--text-primary);">No staff to display.</h3></td></tr>`;
  } else {
    sortedEmployees.forEach((emp, index) => {
      const pendingAtt = currentAttendancePendingChanges[emp.id];
      const status = pendingAtt?.status || '';
      const clockIn = formatTime(pendingAtt?.clock_in);
      const clockOut = formatTime(pendingAtt?.clock_out);
      const breakStart = formatTime(pendingAtt?.break_start);
      const breakEnd = formatTime(pendingAtt?.break_end);
      const totalBreak = pendingAtt?.total_break || 0;
      const hours = pendingAtt?.hours || 0;
      const pay = pendingAtt?.pay || 0;
      const note = pendingAtt?.note || '';

      const isClockedIn = pendingAtt?.clock_in && !pendingAtt.clock_out;
      const isOnBreak = pendingAtt?.break_start && !pendingAtt.break_end;

      if (status === 'present') presentCount++;
      else if (status === 'half') halfCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'sick') sickCount++;
      else if (status === 'leave') leaveCount++;

      totalHours += hours;
      totalPay += pay;

      const avatar = getAvatarColor(emp.name);
      const initial = (emp.name || '?')[0].toUpperCase();

      // Helper: build a clock-picker tap button for table cells
      const tpBtn = (field, val, label, disabled) => {
        const display = val ? formatTime(val) : '—';
        const hasVal  = !!val;
        const style   = `padding:5px 8px;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:${disabled?'not-allowed':'pointer'};white-space:nowrap;transition:all .15s;min-width:58px;text-align:center;` +
          (disabled
            ? 'background:#e4e9f0;color:#b2bec3;opacity:.5;'
            : hasVal
              ? 'background:#ede9ff;color:#6c5ce7;box-shadow:2px 2px 5px rgba(163,177,198,.4),-2px -2px 5px rgba(255,255,255,.8);'
              : 'background:#e4e9f0;color:#95a5a6;box-shadow:2px 2px 5px rgba(163,177,198,.4),-2px -2px 5px rgba(255,255,255,.8);');
        const onclick = disabled ? '' : `onclick="shpTimePicker('${emp.id}','${field}','${val||''}','${label}',function(v){attTableTimeSet('${emp.id}','${field}',v)})"`;
        return `<button style="${style}" ${disabled?'disabled':''} ${onclick}>${display}</button>`;
      };

      rowsHtml += `
        <tr id="att-row-${emp.id}" class="${pendingAtt.manual_override ? 'flash' : ''}">
          <td style="font-weight:700;color:var(--text-secondary)">${index + 1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="av" style="background:${avatar};width:28px;height:28px;border-radius:7px;font-size:10px;">${initial}</div>
              <div><div style="font-weight:700;font-size:11px;color:var(--text-primary);">${emp.name}</div><div style="font-size:8px;color:var(--text-secondary)">${emp.phone}</div></div>
            </div>
          </td>
          <td style="color:var(--text-secondary);font-size:10px">${formatCurrency(emp.wage || 0)}/hr</td>
          <td style="min-width:120px;">
            <div class="ms-btns">
              <button class="ms-b ${status === 'present' ? 'on' : ''}" data-v="present" onclick="updateStaffAttendanceStatus('${emp.id}', 'present')">✅</button>
              <button class="ms-b ${status === 'half' ? 'on' : ''}" data-v="half" onclick="updateStaffAttendanceStatus('${emp.id}', 'half')">½</button>
              <button class="ms-b ${status === 'absent' ? 'on' : ''}" data-v="absent" onclick="updateStaffAttendanceStatus('${emp.id}', 'absent')">❌</button>
              <button class="ms-b ${status === 'sick' ? 'on' : ''}" data-v="sick" onclick="updateStaffAttendanceStatus('${emp.id}', 'sick')">🤒</button>
              <button class="ms-b ${status === 'leave' ? 'on' : ''}" data-v="leave" onclick="updateStaffAttendanceStatus('${emp.id}', 'leave')">🏖️</button>
            </div>
          </td>
          <td>${tpBtn('clock_in',  pendingAtt.clock_in,  'Clock In',  status !== 'present')}</td>
          <td>${tpBtn('clock_out', pendingAtt.clock_out, 'Clock Out', status !== 'present' || !pendingAtt.clock_in)}</td>
          <td>
            <div style="display:flex;flex-direction:column;gap:4px;">
              ${tpBtn('break_start', pendingAtt.break_start, 'Break Start', status !== 'present' || !pendingAtt.clock_in)}
              ${tpBtn('break_end',   pendingAtt.break_end,   'Break End',   status !== 'present' || !pendingAtt.break_start)}
              <span style="font-size:9px;color:var(--text-secondary);text-align:center;">${totalBreak > 0 ? totalBreak + ' min' : ''}</span>
            </div>
          </td>
          <td>
            <input
              id="att-hrs-${emp.id}"
              type="number"
              value="${hours.toFixed(1)}"
              min="0" max="24" step="0.5"
              ${(status !== 'present' && status !== 'half') ? 'disabled' : ''}
              onchange="attEditHours('${emp.id}', parseFloat(this.value)||0)"
              style="
                width:58px;padding:6px 6px;
                background:${(status==='present'||status==='half') ? '#ede9ff' : '#e4e9f0'};
                border:none;border-radius:8px;
                font-size:12px;font-weight:800;
                color:${(status==='present'||status==='half') ? '#6c5ce7' : '#95a5a6'};
                text-align:center;font-family:inherit;
                box-shadow:inset 2px 2px 5px rgba(163,177,198,.45),inset -2px -2px 5px rgba(255,255,255,.85);
                -moz-appearance:textfield;outline:none;
                cursor:${(status==='present'||status==='half') ? 'text' : 'not-allowed'};
                opacity:${(status==='present'||status==='half') ? '1' : '0.45'};
              "
            >
          </td>
          <td class="ma-pay ${pay > 0 ? 'amp' : ''}" id="att-pay-${emp.id}">${pay > 0 ? formatCurrency(pay) : '—'}</td>
          <td><input class="ma-note" value="${note}" placeholder="Note..." onchange="updateStaffAttendanceNote('${emp.id}', this.value)"></td>
          <td>
            <div style="display:flex; flex-direction:column; gap:4px;">
                ${!isClockedIn && status === 'present' ? `<button class="bic" onclick="performClockAction('${emp.id}', 'clockIn')" title="Clock In" style="color:var(--col-success);"><i class="fas fa-sign-in-alt"></i></button>` : ''}
                ${isClockedIn ? `<button class="bic" onclick="performClockAction('${emp.id}', 'clockOut')" title="Clock Out" style="color:var(--col-danger);"><i class="fas fa-sign-out-alt"></i></button>` : ''}
                ${isClockedIn && !isOnBreak ? `<button class="bic" onclick="performClockAction('${emp.id}', 'startBreak')" title="Start Break" style="color:orange;"><i class="fas fa-coffee"></i></button>` : ''}
                ${isOnBreak ? `<button class="bic" onclick="performClockAction('${emp.id}', 'endBreak')" title="End Break" style="color:var(--col-success);"><i class="fas fa-undo-alt"></i></button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });
  }
  container.innerHTML = rowsHtml;

  // ── Mobile card view (shown instead of table on small screens) ──
  const cardsEl = $('attendance-mobile-cards');
  if (cardsEl) {
    if (sortedEmployees.length === 0) {
      cardsEl.innerHTML = `<div style="text-align:center;padding:24px;color:#95a5a6;font-size:12px;">No staff added yet.</div>`;
    } else {
      cardsEl.innerHTML = sortedEmployees.map((emp) => {
        const pa = currentAttendancePendingChanges[emp.id];
        const st = pa?.status || '';
        const av = getAvatarColor(emp.name);
        const init = (emp.name||'?')[0].toUpperCase();
        const stColors = {present:'#00856b',half:'#009e99',absent:'#c0392b',sick:'#c47f17',leave:'#2471a3'};
        const stLabels = {present:'✅ Present',half:'½ Half Day',absent:'❌ Absent',sick:'🤒 Sick',leave:'🏖️ Leave'};
        const stColor = stColors[st] || '#95a5a6';
        const stLabel = stLabels[st] || '— Unmarked';
        const canTime = st === 'present' || st === 'half';
        const ciVal = pa.clock_in ? formatTime(pa.clock_in) : null;
        const coVal = pa.clock_out ? formatTime(pa.clock_out) : null;
        const bsVal = pa.break_start ? formatTime(pa.break_start) : null;
        const beVal = pa.break_end ? formatTime(pa.break_end) : null;
        const hrs = (pa.hours||0).toFixed(1);
        const pay = pa.pay||0;
        const totalBreakMin = pa.total_break || 0;
        return `
          <div class="att-card-enhanced" id="att-card-${emp.id}">
            <!-- Header row -->
            <div class="att-card-header">
              <div style="width:38px;height:38px;border-radius:11px;background:${av};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;flex-shrink:0;box-shadow:2px 2px 6px rgba(163,177,198,.5)">${init}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:800;color:#2d3436;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${emp.name}</div>
                <div style="font-size:9px;color:#95a5a6;margin-top:1px">${emp.phone||''} &middot; <strong style="color:#6c5ce7">${formatCurrency(emp.wage||0)}/hr</strong></div>
              </div>
              <div style="font-size:11px;font-weight:800;color:${stColor};background:${st?'rgba('+[stColor.match(/\w{2}/g)||[]].map(c=>parseInt(c,16)).join(',')+', .1)':'transparent'};padding:4px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0">${stLabel}</div>
            </div>
            <!-- Status buttons -->
            <div style="padding:10px 14px 8px;display:flex;gap:6px;align-items:center">
              <button class="ms-b ${st==='present'?'on':''}" data-v="present" onclick="updateStaffAttendanceStatus('${emp.id}','present')" style="flex:1;width:auto;border-radius:8px;font-size:10px;gap:3px;padding:8px 4px">✅<br><span style="font-size:8px">Present</span></button>
              <button class="ms-b ${st==='half'?'on':''}" data-v="half" onclick="updateStaffAttendanceStatus('${emp.id}','half')" style="flex:1;width:auto;border-radius:8px;font-size:10px;gap:3px;padding:8px 4px">½<br><span style="font-size:8px">Half</span></button>
              <button class="ms-b ${st==='absent'?'on':''}" data-v="absent" onclick="updateStaffAttendanceStatus('${emp.id}','absent')" style="flex:1;width:auto;border-radius:8px;font-size:10px;gap:3px;padding:8px 4px">❌<br><span style="font-size:8px">Absent</span></button>
              <button class="ms-b ${st==='sick'?'on':''}" data-v="sick" onclick="updateStaffAttendanceStatus('${emp.id}','sick')" style="flex:1;width:auto;border-radius:8px;font-size:10px;gap:3px;padding:8px 4px">🤒<br><span style="font-size:8px">Sick</span></button>
              <button class="ms-b ${st==='leave'?'on':''}" data-v="leave" onclick="updateStaffAttendanceStatus('${emp.id}','leave')" style="flex:1;width:auto;border-radius:8px;font-size:10px;gap:3px;padding:8px 4px">🏖️<br><span style="font-size:8px">Leave</span></button>
            </div>
            ${canTime ? `
            <!-- Time fields grid -->
            <div class="att-card-times">
              <div class="att-time-field">
                <div class="att-time-label">⏰ Clock In</div>
                <button class="att-time-btn ${ciVal?'has-value':''}" onclick="shpTimePicker('${emp.id}','clock_in','${pa.clock_in||''}','Clock In',function(v){attCardTimeSet('${emp.id}','clock_in',v)})">
                  <span>${ciVal || 'Tap to set'}</span><span class="tp-arrow">›</span>
                </button>
              </div>
              <div class="att-time-field">
                <div class="att-time-label">🏁 Clock Out</div>
                <button class="att-time-btn ${coVal?'has-value':''} ${!ciVal?'disabled':''}" ${!ciVal?'disabled':''} onclick="${ciVal?`shpTimePicker('${emp.id}','clock_out','${pa.clock_out||''}','Clock Out',function(v){attCardTimeSet('${emp.id}','clock_out',v)})`:''}">
                  <span>${coVal || (ciVal?'Tap to set':'—')}</span><span class="tp-arrow">›</span>
                </button>
              </div>
            </div>
            <div class="att-card-break-row">
              <div class="att-time-field">
                <div class="att-time-label">☕ Break Start</div>
                <button class="att-time-btn ${bsVal?'has-value':''} ${!ciVal?'disabled':''}" ${!ciVal?'disabled':''} onclick="${ciVal?`shpTimePicker('${emp.id}','break_start','${pa.break_start||''}','Break Start',function(v){attCardTimeSet('${emp.id}','break_start',v)})`:''}">
                  <span>${bsVal || (ciVal?'Optional':'—')}</span><span class="tp-arrow">›</span>
                </button>
              </div>
              <div class="att-time-field">
                <div class="att-time-label">🔄 Break End</div>
                <button class="att-time-btn ${beVal?'has-value':''} ${!bsVal?'disabled':''}" ${!bsVal?'disabled':''} onclick="${bsVal?`shpTimePicker('${emp.id}','break_end','${pa.break_end||''}','Break End',function(v){attCardTimeSet('${emp.id}','break_end',v)})`:''}">
                  <span>${beVal || (bsVal?'Tap to set':'—')}</span><span class="tp-arrow">›</span>
                </button>
              </div>
              <div class="att-time-field">
                <div class="att-time-label">⏱ Break Total</div>
                <div style="padding:10px 12px;background:#e4e9f0;border-radius:10px;font-size:13px;font-weight:700;color:#636e72;min-height:40px;display:flex;align-items:center;box-shadow:inset 2px 2px 5px rgba(163,177,198,.45),inset -2px -2px 5px rgba(255,255,255,.85)">
                  ${totalBreakMin > 0 ? totalBreakMin + ' min' : '—'}
                </div>
              </div>
            </div>
            <!-- Summary bar -->
            <div class="att-summary-bar">
              <div class="att-summary-item">
                <div class="att-summary-val">${hrs}h</div>
                <div class="att-summary-lbl">Hours</div>
              </div>
              <div class="att-summary-item">
                <div class="att-summary-val" style="color:#636e72">${formatCurrency(emp.wage||0)}</div>
                <div class="att-summary-lbl">Per Hour</div>
              </div>
              <div class="att-summary-item pay-val">
                <div class="att-summary-val">${pay>0?formatCurrency(pay):'—'}</div>
                <div class="att-summary-lbl">Today's Pay</div>
              </div>
            </div>
            <!-- Note -->
            <div class="att-note-row">
              <input class="att-note-input" placeholder="Add a note..." value="${(pa.note||'').replace(/"/g,'&quot;')}" onchange="attCardNoteSet('${emp.id}',this.value)">
            </div>
            ` : ''}
          </div>`;
      }).join('');
    }
  }

  // Update summary stats
  $('attendance-summary-stats').innerHTML = `
    <div class="ma-sum-i"><div class="msv amp">${presentCount}</div><div class="msl">Present</div></div>
    <div class="ma-sum-i"><div class="msv" style="color:#009e99">${halfCount}</div><div class="msl">Half</div></div>
    <div class="ma-sum-i"><div class="msv amn">${absentCount}</div><div class="msl">Absent</div></div>
    <div class="ma-sum-i"><div class="msv" style="color:#c47f17">${sickCount}</div><div class="msl">Sick</div></div>
    <div class="ma-sum-i"><div class="msv" style="color:#2471a3">${leaveCount}</div><div class="msl">Leave</div></div>
    <div class="ma-sum-i"><div class="msv">${totalHours.toFixed(1)}h</div><div class="msl">Hours</div></div>
    <div class="ma-sum-i" style="box-shadow:inset 2px 2px 4px rgba(163,177,198,.5),inset -2px -2px 4px rgba(255,255,255,.85),0 0 0 1px rgba(108,92,231,.2)"><div class="msv amp">${formatCurrency(totalPay)}</div><div class="msl">Pay</div></div>
  `;
  $('attendance-total-summary').innerHTML = `📊 <span class="amp">${totalHours.toFixed(1)}h</span> · <span class="amp">${formatCurrency(totalPay)}</span> · ${app.employees.length} staff`;

  updateAttendanceSheetSaveButton();
  // Only re-init date flatpickr if it doesn't exist yet (avoid destroying it on every render)
  if (!attendanceFlatpickrInstance) initializeFlatpickrs();
  else {
    const attInput = $('attendance-sheet-date');
    if (attInput) attInput.value = formatAttendanceDateDisplay(currentAttendanceDate);
  }
}


function performClockAction(employeeId, actionType) {
  let result;
  const emp = app.employees.find(e => e.id === employeeId);
  if (!emp) return showToast('Employee not found', 'err');

  let pendingAtt = currentAttendancePendingChanges[employeeId];
  if (!pendingAtt) { // This should ideally not happen if loadPendingAttendanceForDate is called
    pendingAtt = {
      id: 'PENDING-ATT-' + emp.id + '-' + Date.now().toString(36).substr(2, 5), 
      date: currentAttendanceDate,
      status: 'present',
      clock_in: null, clock_out: null, break_start: null, break_end: null,
      total_break: 0, regular_hours: 0, overtime_hours: 0, hours: 0, pay: 0, note: '',
      manual_override: false
    };
    currentAttendancePendingChanges[employeeId] = pendingAtt;
  }
  
  // Simulate clock actions by modifying pendingAtt directly
  const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  switch (actionType) {
    case 'clockIn':
      if (pendingAtt.clock_in && !pendingAtt.clock_out) {
        result = { success: false, message: 'Already clocked in.' };
      } else {
        pendingAtt.clock_in = nowTime;
        pendingAtt.clock_out = null;
        pendingAtt.status = 'present';
        pendingAtt.break_start = null;
        pendingAtt.break_end = null;
        pendingAtt.total_break = 0;
        result = { success: true, message: 'Clocked in successfully.' };
      }
      break;
    case 'clockOut':
      if (!pendingAtt.clock_in) {
        result = { success: false, message: 'Not clocked in today.' };
      } else if (pendingAtt.clock_out) {
        result = { success: false, message: 'Already clocked out.' };
      } else {
        // Auto-end break if active
        if (pendingAtt.break_start && !pendingAtt.break_end) {
          const start = new Date(`1970-01-01T${pendingAtt.break_start}`);
          const end = new Date(`1970-01-01T${nowTime}`);
          const breakMinutes = Math.round((end - start) / 60000);
          pendingAtt.total_break = (pendingAtt.total_break || 0) + breakMinutes;
          pendingAtt.break_end = nowTime;
          showToast('Break auto-ended.', 'inf');
        }
        pendingAtt.clock_out = nowTime;
        calculateDailyHours(pendingAtt, emp.dutyHours || 12, emp.wage || 0);
        result = { success: true, message: 'Clocked out successfully.' };
      }
      break;
    case 'startBreak':
      if (!pendingAtt.clock_in) {
        result = { success: false, message: 'Must clock in first.' };
      } else if (pendingAtt.clock_out) {
        result = { success: false, message: 'Already clocked out.' };
      } else if (pendingAtt.break_start && !pendingAtt.break_end) {
        result = { success: false, message: 'Break already started.' };
      } else {
        pendingAtt.break_start = nowTime;
        pendingAtt.break_end = null;
        result = { success: true, message: 'Break started.' };
      }
      break;
    case 'endBreak':
      if (!pendingAtt.break_start || pendingAtt.break_end) {
        result = { success: false, message: 'No active break to end.' };
      } else {
        pendingAtt.break_end = nowTime;
        const start = new Date(`1970-01-01T${pendingAtt.break_start}`);
        const end = new Date(`1970-01-01T${nowTime}`);
        const breakMinutes = Math.round((end - start) / 60000);
        pendingAtt.total_break = (pendingAtt.total_break || 0) + breakMinutes;
        result = { success: true, message: 'Break ended.' };
      }
      break;
  }

  if (result.success) {
    hasUnsavedAttendanceChanges = true;
    updateAttendanceSheetSaveButton();
    renderAttendanceSheet();
    showToast(result.message, 'ok');
  } else {
    showToast(result.message, 'err');
  }
}

function updateStaffAttendanceStatus(employeeId, newStatus) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (!emp) return;

  const pendingAtt = currentAttendancePendingChanges[employeeId];
  if (!pendingAtt) return;

  pendingAtt.status = newStatus;
  pendingAtt.manual_override = true;

  /* ── Helper: build HH:MM:SS string from "HH:MM" ── */
  function toTimeStr(hhmm) {
    if (!hhmm) return null;
    return hhmm.length === 5 ? hhmm + ':00' : hhmm;
  }

  /* ── Get employee schedule defaults ── */
  const dutyStart   = emp.dutyStart   || '12:00';     // e.g. "12:00"
  const dutyEnd     = emp.dutyEnd     || '00:00';     // e.g. "00:00"
  const dutyHours   = emp.dutyHours   || 12;
  const defBreakMin = emp.defaultBreak !== undefined ? emp.defaultBreak : 0;

  /* ── Calculate half-day end time ── */
  function addMins(hhmm, mins) {
    const p   = hhmm.split(':');
    let total = parseInt(p[0],10)*60 + parseInt(p[1],10) + mins;
    total     = ((total % 1440) + 1440) % 1440;        // wrap 24h
    return String(Math.floor(total/60)).padStart(2,'0') + ':' +
           String(total%60).padStart(2,'0');
  }

  if (newStatus === 'present') {
    pendingAtt.clock_in    = toTimeStr(dutyStart);
    pendingAtt.clock_out   = toTimeStr(dutyEnd);

    /* Use explicit break times from profile if available */
    if (emp.breakStart && emp.breakEnd) {
      pendingAtt.break_start = toTimeStr(emp.breakStart);
      pendingAtt.break_end   = toTimeStr(emp.breakEnd);
      const bs = new Date('1970-01-01T' + pendingAtt.break_start);
      let   be = new Date('1970-01-01T' + pendingAtt.break_end);
      if (be <= bs) be = new Date(be.getTime() + 86400000);
      pendingAtt.total_break = Math.round((be - bs) / 60000);
    } else if (defBreakMin > 0) {
      const midPoint = dutyHours / 2;
      const bsHhmm   = addMins(dutyStart, Math.round(midPoint * 60));
      const beHhmm   = addMins(bsHhmm,   defBreakMin);
      pendingAtt.break_start = toTimeStr(bsHhmm);
      pendingAtt.break_end   = toTimeStr(beHhmm);
      pendingAtt.total_break = defBreakMin;
    } else {
      pendingAtt.break_start = null;
      pendingAtt.break_end   = null;
      pendingAtt.total_break = 0;
    }

    pendingAtt.hours         = dutyHours;
    pendingAtt.regular_hours = dutyHours;
    pendingAtt.overtime_hours= 0;
    pendingAtt.pay           = Math.round(dutyHours * (emp.wage || 0));

    if (pendingAtt.clock_in && pendingAtt.clock_out) {
      calculateDailyHours(pendingAtt, dutyHours, emp.wage || 0);
    }

  } else if (newStatus === 'half') {
    const halfHours = dutyHours / 2;
    pendingAtt.clock_in    = toTimeStr(dutyStart);
    pendingAtt.clock_out   = toTimeStr(addMins(dutyStart, Math.round(halfHours * 60)));
    pendingAtt.break_start = null;
    pendingAtt.break_end   = null;
    pendingAtt.total_break = 0;
    pendingAtt.hours         = halfHours;
    pendingAtt.regular_hours = halfHours;
    pendingAtt.overtime_hours= 0;
    pendingAtt.pay           = Math.round(halfHours * (emp.wage || 0));

  } else {
    /* absent / sick / leave / off — clear everything */
    pendingAtt.clock_in    = null;
    pendingAtt.clock_out   = null;
    pendingAtt.break_start = null;
    pendingAtt.break_end   = null;
    pendingAtt.total_break = 0;
    pendingAtt.hours         = 0;
    pendingAtt.regular_hours = 0;
    pendingAtt.overtime_hours= 0;
    pendingAtt.pay           = 0;
  }

  hasUnsavedAttendanceChanges = true;
  renderAttendanceSheet();
}

function updateStaffAttendanceTime(employeeId, field, value) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (!emp) return;

  const pendingAtt = currentAttendancePendingChanges[employeeId];
  if (!pendingAtt) return;

  pendingAtt[field] = value;
  pendingAtt.manual_override = true;

  // Recalculate hours and pay if both clock in/out are present
  if (pendingAtt.clock_in && pendingAtt.clock_out) {
    calculateDailyHours(pendingAtt, emp.dutyHours || 12, emp.wage || 0);
  } else {
    pendingAtt.hours = 0;
    pendingAtt.regular_hours = 0;
    pendingAtt.overtime_hours = 0;
    pendingAtt.pay = 0;
  }

  // If break times are updated, recalculate total_break
  if (field.startsWith('break_')) {
    if (pendingAtt.break_start && pendingAtt.break_end) {
      const start = new Date(`1970-01-01T${pendingAtt.break_start}`);
      const end = new Date(`1970-01-01T${pendingAtt.break_end}`);
      if (end >= start) { // Only calculate if end time is after start time
        pendingAtt.total_break = Math.round((end - start) / 60000);
      } else {
        pendingAtt.total_break = 0; // Invalid break time
      }
    } else {
      pendingAtt.total_break = 0; // Clear if incomplete
    }
  }

  hasUnsavedAttendanceChanges = true;
  renderAttendanceSheet();
}

function updateStaffAttendanceNote(employeeId, note) {
  const pendingAtt = currentAttendancePendingChanges[employeeId];
  if (pendingAtt) {
    pendingAtt.note = note.trim();
    pendingAtt.manual_override = true;
    hasUnsavedAttendanceChanges = true;
    updateAttendanceSheetSaveButton();
  }
}

function setAllStaffAttendance(status) {
  app.employees.forEach(emp => {
    const pendingAtt = currentAttendancePendingChanges[emp.id];
    if (!pendingAtt) return; // Should not happen

    pendingAtt.status = status;
    pendingAtt.manual_override = true;
    
    // Reset times/pay based on new status
    if (status === 'present') {
      pendingAtt.hours = emp.dutyHours || 12; // Default to full duty hours
      pendingAtt.regular_hours = emp.dutyHours || 12;
      pendingAtt.overtime_hours = 0;
      pendingAtt.pay = Math.round((emp.dutyHours || 12) * (emp.wage || 0));
      pendingAtt.clock_in = pendingAtt.clock_in || '09:00:00'; // Default clock in for presence
      pendingAtt.clock_out = pendingAtt.clock_out || new Date(new Date(`1970-01-01T09:00:00`).getTime() + (pendingAtt.hours * 3600000)).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else if (status === 'half') {
      pendingAtt.hours = (emp.dutyHours || 12) / 2;
      pendingAtt.regular_hours = (emp.dutyHours || 12) / 2;
      pendingAtt.overtime_hours = 0;
      pendingAtt.pay = Math.round(((emp.dutyHours || 12) / 2) * (emp.wage || 0));
      pendingAtt.clock_in = pendingAtt.clock_in || '09:00:00'; 
      pendingAtt.clock_out = pendingAtt.clock_out || new Date(new Date(`1970-01-01T09:00:00`).getTime() + (pendingAtt.hours * 3600000)).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else {
      pendingAtt.hours = 0;
      pendingAtt.regular_hours = 0;
      pendingAtt.overtime_hours = 0;
      pendingAtt.pay = 0;
      pendingAtt.clock_in = null;
      pendingAtt.clock_out = null;
    }
    // Clear breaks for all-set actions
    pendingAtt.break_start = null;
    pendingAtt.break_end = null;
    pendingAtt.total_break = 0;
  });
  hasUnsavedAttendanceChanges = true;
  renderAttendanceSheet();
  showToast(`All staff marked as ${status}.`, 'inf');
}

function clearAllStaffAttendance() {
  showConfirm('Clear All Attendance?', `Are you sure you want to clear all attendance markings for ${currentAttendanceDate}? This will remove all pending changes.`, '🧹', 'Clear', () => {
    app.employees.forEach(emp => {
      currentAttendancePendingChanges[emp.id] = {
        id: 'PENDING-ATT-' + emp.id + '-' + Date.now().toString(36).substr(2, 5), 
        date: currentAttendanceDate,
        status: '', // Unmarked
        clock_in: null, clock_out: null, break_start: null, break_end: null,
        total_break: 0, regular_hours: 0, overtime_hours: 0, hours: 0, pay: 0, note: '',
        manual_override: false
      };
    });
    hasUnsavedAttendanceChanges = true;
    renderAttendanceSheet();
    showToast('All attendance cleared.', 'inf');
  });
}

function saveMasterAttendance() {
  if (!hasUnsavedAttendanceChanges) return;

  // Create a temporary array to store updated attendance records
  // This avoids modifying app.employees directly until all records are processed
  const updatedEmployees = JSON.parse(JSON.stringify(app.employees));

  updatedEmployees.forEach(emp => {
    // Filter out any existing attendance records for the current date for this employee
    emp.attendance = (emp.attendance || []).filter(a => a.date !== currentAttendanceDate);

    const pendingAtt = currentAttendancePendingChanges[emp.id];
    // Only add pendingAtt if it has a status marked or logged times, otherwise it's implicitly unmarked
    if (pendingAtt && (pendingAtt.status || pendingAtt.clock_in || pendingAtt.note)) {
      // Ensure the ID is unique and not a PENDING-ATT ID
      pendingAtt.id = 'ATT-' + emp.id + '-' + Date.now().toString(36).substr(2, 5);
      pendingAtt.manual_override = true; // Mark as manually overridden if it went through the sheet
      emp.attendance.push(pendingAtt);
    }
  });

  app.employees = updatedEmployees; // Update the global app.employees
  localStorage.setItem('pos_employees', JSON.stringify(app.employees));
  
  hasUnsavedAttendanceChanges = false;
  updateAttendanceSheetSaveButton();
  loadPendingAttendanceForDate(); // Reload to refresh state (clears pending changes too)
  renderAttendanceSheet(); // Re-render table with saved state
  renderDashboardContent($('employee-modal-main-content')); // Update dashboard summary
  renderAllStaffAttendanceHistory(); // Update history
  showToast(`Attendance saved for ${formatDateShort(currentAttendanceDate)}`, 'ok');
}

// ========== ALL STAFF ATTENDANCE HISTORY ==========

function renderAllStaffAttendanceHistory() {
  const container = $('all-staff-attendance-history-table');
  if (!container) return;

  const y = attendanceHistoryMonth.getFullYear();
  const m = attendanceHistoryMonth.getMonth();
  const monthString = `${y}-${String(m + 1).padStart(2, '0')}`;

  // Always set the month label
  const label = $('attendance-history-month-label');
  if (label) label.textContent = formatMonthYear(attendanceHistoryMonth);

  const relevantAttendance = [];
  app.employees.forEach(emp => {
    (emp.attendance || []).forEach(att => {
      if (att.date && att.date.startsWith(monthString)) {
        relevantAttendance.push({ ...att, employeeName: emp.name });
      }
    });
  });

  relevantAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (relevantAttendance.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px 16px;color:#95a5a6;">
        <div style="font-size:36px;margin-bottom:8px;opacity:.4;">📜</div>
        <h3 style="font-size:13px;margin-bottom:4px;color:#636e72;">No Records</h3>
        <p style="font-size:11px;">No attendance records for ${formatMonthYear(attendanceHistoryMonth)}.</p>
      </div>`;
    return;
  }

  let html = `
    <table style="width:100%;border-collapse:collapse;min-width:320px;">
      <thead>
        <tr>
          <th style="padding:8px;text-align:left;font-size:9px;font-weight:700;color:#95a5a6;text-transform:uppercase;letter-spacing:.8px;background:#dfe4ec;">Date</th>
          <th style="padding:8px;text-align:left;font-size:9px;font-weight:700;color:#95a5a6;text-transform:uppercase;letter-spacing:.8px;background:#dfe4ec;">Staff</th>
          <th style="padding:8px;text-align:left;font-size:9px;font-weight:700;color:#95a5a6;text-transform:uppercase;letter-spacing:.8px;background:#dfe4ec;">Status</th>
          <th style="padding:8px;text-align:left;font-size:9px;font-weight:700;color:#95a5a6;text-transform:uppercase;letter-spacing:.8px;background:#dfe4ec;">Hrs</th>
          <th style="padding:8px;text-align:left;font-size:9px;font-weight:700;color:#95a5a6;text-transform:uppercase;letter-spacing:.8px;background:#dfe4ec;">Pay</th>
        </tr>
      </thead>
      <tbody>
  `;

  relevantAttendance.forEach(att => {
    const statusClass = `b-${att.status || 'unmarked'}`;
    const statusText  = att.status ? (att.status.charAt(0).toUpperCase() + att.status.slice(1)) : 'Unmarked';
    const hoursText   = (att.status === 'present' || att.status === 'half') ? `${(att.hours || 0).toFixed(1)}h` : '—';
    const payText     = (att.status === 'present' || att.status === 'half') ? formatCurrency(att.pay || 0) : '—';
    const payColor    = (att.status === 'present' || att.status === 'half') && att.pay > 0 ? '#00856b' : '#95a5a6';
    const dateLabel   = formatDateShort(att.date);

    html += `
      <tr style="border-bottom:1px solid #dfe4ec;">
        <td style="padding:8px;font-size:10px;color:#636e72;white-space:nowrap;">${dateLabel}</td>
        <td style="padding:8px;font-size:11px;font-weight:600;color:#2d3436;">${att.employeeName}</td>
        <td style="padding:8px;"><span class="badge ${statusClass}" style="padding:3px 8px;border-radius:6px;font-size:8px;font-weight:700;">${statusText}</span></td>
        <td style="padding:8px;font-size:11px;color:#2d3436;">${hoursText}</td>
        <td style="padding:8px;font-size:11px;font-weight:700;color:${payColor};">${payText}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function changeAttendanceHistoryMonth(delta) {
  attendanceHistoryMonth.setMonth(attendanceHistoryMonth.getMonth() + delta);
  renderAllStaffAttendanceHistory();
}

// ========== EXPORT/IMPORT (removed from UI but kept for internal use) ==========
function exportEmployees() {
  const data = {
    staffhub_version: '1.0-employee',
    exported_date: new Date().toISOString(),
    employees: app.employees
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `staffhub_employees_export_${getTodayDateString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Employee data exported!', 'ok');
}

function importEmployees(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      if (importedData.employees && Array.isArray(importedData.employees)) {
        showConfirm('Import Employee Data?', `This will REPLACE all current employee data with ${importedData.employees.length} employees from the file. Are you sure?`, '📥', 'Import', () => {
          app.employees = importedData.employees;
          localStorage.setItem('pos_employees', JSON.stringify(app.employees));
          showToast('Employee data imported successfully!', 'ok');
          
          // Re-render UI after import
          currentEmployeeDetailId = null;
          switchEmployeeModalMainTab('staff');
        });
      } else {
        showToast('Invalid file format. Expected an array of employees.', 'err');
      }
    } catch (error) {
      showToast(`Error reading file: ${error.message}`, 'err');
    }
  };
  reader.readAsText(file);
  input.value = ''; // Clear file input
}

// New backup/restore functions for employee data (similar to main POS backup)
function backupEmployees() {
  const data = {
    staffhub_version: '1.0-employee-backup',
    backup_date: new Date().toISOString(),
    employees: app.employees
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `staffhub_employees_backup_${getTodayDateString()}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Employee data backup created!', 'ok');
}

function restoreEmployees(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const restoredData = JSON.parse(e.target.result);
      if (restoredData.employees && Array.isArray(restoredData.employees)) {
        showConfirm('Restore Employee Data?', `This will REPLACE all current employee data with ${restoredData.employees.length} employees from the backup file. Are you sure?`, '🔄', 'Restore', () => {
          app.employees = restoredData.employees;
          localStorage.setItem('pos_employees', JSON.stringify(app.employees));
          showToast('Employee data restored successfully!', 'ok');
          
          // Re-render UI after restore
          currentEmployeeDetailId = null;
          switchEmployeeModalMainTab('staff');
        });
      } else {
        showToast('Invalid backup file format. Expected an array of employees.', 'err');
      }
    } catch (error) {
      showToast(`Error reading backup file: ${error.message}`, 'err');
    }
  };
  reader.readAsText(file);
  input.value = ''; // Clear file input
}


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Flatpickr for the attendance date input field
  // This will be called again when the modal opens, so ensure it handles re-initialization
  initializeFlatpickrs();
});
/* ══════════════════════════════════════════════════════════════════════
   BEAUTIFUL TIME PICKER — StaffHub Pro style
   Opens as a bottom-sheet on mobile, centered popup on desktop

/* ═══════════════════════════════════════════════════════════════════════
   SIMPLE & RELIABLE TIME PICKER
   - No SVG, no scroll drums, no native inputs
   - Large +/- buttons for hour and minute  
   - AM/PM toggle
   - Stores value ONLY when user taps OK
   - Never triggers re-render until confirm
═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
   CLOCK TIME PICKER  — 100% faithful to reference design
   Self-contained popup, wired to attCardTimeSet callback.
   Never triggers DOM re-render. Time values persist permanently.
═══════════════════════════════════════════════════════════════════════ */
(function injectClockPickerAssets() {
  if (document.getElementById('shp-clock-css')) return;

  /* ── CSS ── */
  const s = document.createElement('style');
  s.id = 'shp-clock-css';
  s.textContent = `
/* Backdrop */
#shp-clock-backdrop {
  position:fixed;inset:0;z-index:999999;
  background:rgba(0,0,0,.38);
  display:flex;align-items:center;justify-content:center;
  padding:16px;
}
/* Picker card */
#shp-clock-picker {
  background:#f0f0e8;border-radius:28px;
  padding:24px 24px 16px;width:320px;max-width:96vw;
  box-shadow:0 8px 40px rgba(0,0,0,.28);
  user-select:none;-webkit-user-select:none;
  outline:none;
  position:relative;
}
/* Label */
.shp-cl-label {
  font-size:11px;letter-spacing:1.8px;
  color:#888;font-weight:600;margin-bottom:16px;
  text-transform:uppercase;
}
/* Time row */
.shp-cl-time-row {
  display:flex;align-items:center;gap:4px;margin-bottom:20px;
}
.shp-cl-seg {
  background:#e2e2da;border-radius:10px;
  width:86px;height:68px;
  display:flex;align-items:center;justify-content:center;
  font-size:46px;font-weight:400;color:#111;
  cursor:pointer;letter-spacing:-1px;
  transition:background .22s,color .22s;
  outline:none;
}
.shp-cl-seg.active {background:#a8d878;color:#1a4a1a;}
.shp-cl-colon {
  font-size:42px;color:#444;font-weight:300;
  margin:0 2px;padding-bottom:4px;
}
.shp-cl-ampm-col {
  display:flex;flex-direction:column;gap:4px;margin-left:auto;
}
.shp-cl-ampm-btn {
  background:#e2e2da;border:none;border-radius:8px;
  width:54px;height:30px;font-size:13px;font-weight:600;
  color:#555;cursor:pointer;letter-spacing:.5px;
  transition:background .18s,color .18s;
  outline:none;
}
.shp-cl-ampm-btn.active {background:#a8d4e8;color:#1a3a4a;}
/* Clock wrap */
.shp-cl-clock-wrap {
  position:relative;width:268px;height:268px;
  margin:0 auto 20px;touch-action:none;cursor:grab;
  outline:none;
}
.shp-cl-clock-wrap.dragging {cursor:grabbing;}
.shp-cl-clock-face {
  position:absolute;inset:0;border-radius:50%;
  background:#e4e4da;pointer-events:auto;
}
.shp-cl-clock-svg {
  position:absolute;inset:0;width:100%;height:100%;overflow:visible;
}
.shp-cl-num {
  position:absolute;width:34px;height:34px;
  display:flex;align-items:center;justify-content:center;
  border-radius:50%;font-size:14px;color:#444;
  cursor:pointer;transform:translate(-50%,-50%);
  z-index:2;pointer-events:auto;transition:color .1s;
  outline:none;
}
.shp-cl-num.hidden-svg {color:transparent;pointer-events:none;}
/* Buttons row */
.shp-cl-btn-row {
  display:flex;justify-content:flex-end;gap:20px;padding:4px 4px 0;
}
.shp-cl-btn-row button {
  background:none;border:none;font-size:14px;font-weight:700;
  letter-spacing:1.2px;color:#2d6a2d;cursor:pointer;padding:8px 4px;
  transition:opacity .15s;outline:none;
}
.shp-cl-btn-row button:hover {opacity:.6;}
/* Clear link */
.shp-cl-clear-row {
  display:flex;justify-content:flex-start;padding:0 0 6px;
}
.shp-cl-clear-link {
  background:none;border:none;color:#c0392b;font-size:12px;
  font-weight:700;cursor:pointer;padding:4px 2px;letter-spacing:.5px;
  text-transform:uppercase;
}
.shp-cl-clear-link:hover {opacity:.7;}
  `;
  document.head.appendChild(s);
})();

/* ── Singleton state (window props = no re-declaration crash) ── */
window._shpClCb   = null;
window._shpClH    = 9;
window._shpClM    = 0;
window._shpClAP   = 'AM';
window._shpClMode = 'hour';

/* ── Public entry point called by attendance card buttons ── */
function shpTimePicker(empId, field, currentVal, label, onConfirm) {
  /* Parse existing 24-h "HH:MM:SS" value */
  var h=9, m=0, ap='AM';
  if (currentVal && currentVal.length >= 4) {
    var p = currentVal.split(':');
    var hh = parseInt(p[0],10)||0;
    m  = parseInt(p[1],10)||0;
    ap = hh>=12 ? 'PM' : 'AM';
    if (hh>12) hh-=12;
    if (hh===0) hh=12;
    h  = hh;
  }
  window._shpClH   = h;
  window._shpClM   = m;
  window._shpClAP  = ap;
  window._shpClMode= 'hour';
  window._shpClCb  = onConfirm;

  /* Remove stale picker */
  var old = document.getElementById('shp-clock-backdrop');
  if (old) old.remove();

  /* Build DOM */
  var bd = document.createElement('div');
  bd.id  = 'shp-clock-backdrop';

  /* SVG IDs are unique per instance using a timestamp suffix */
  var uid = Date.now();
  bd.innerHTML =
    '<div id="shp-clock-picker" tabindex="-1">' +
      '<div class="shp-cl-label">' + label + '</div>' +
      '<div class="shp-cl-time-row">' +
        '<div class="shp-cl-seg active" id="shpClH_' + uid + '">' + _shpPad(h) + '</div>' +
        '<div class="shp-cl-colon">:</div>' +
        '<div class="shp-cl-seg" id="shpClM_' + uid + '">' + _shpPad(m) + '</div>' +
        '<div class="shp-cl-ampm-col">' +
          '<button class="shp-cl-ampm-btn' + (ap==='AM'?' active':'') + '" id="shpClAM_' + uid + '">AM</button>' +
          '<button class="shp-cl-ampm-btn' + (ap==='PM'?' active':'') + '" id="shpClPM_' + uid + '">PM</button>' +
        '</div>' +
      '</div>' +
      '<div class="shp-cl-clock-wrap" id="shpClWrap_' + uid + '" tabindex="0">' +
        '<div class="shp-cl-clock-face"></div>' +
        '<svg class="shp-cl-clock-svg" id="shpClSvg_' + uid + '" viewBox="0 0 268 268">' +
          '<g id="shpClTick_' + uid + '"></g>' +
          '<line id="shpClNeedle_' + uid + '" x1="134" y1="134" x2="134" y2="34" stroke="#2d5a2d" stroke-width="2.5" stroke-linecap="round" pointer-events="none"/>' +
          '<circle cx="134" cy="134" r="5" fill="#2d5a2d" pointer-events="none"/>' +
          '<g id="shpClTip_' + uid + '">' +
            '<circle id="shpClTipC_' + uid + '" cx="0" cy="0" r="17" fill="#2d5a2d"/>' +
            '<text id="shpClTipT_' + uid + '" x="0" y="0" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="14" font-weight="600" font-family="Segoe UI,system-ui,sans-serif" pointer-events="none"></text>' +
          '</g>' +
        '</svg>' +
        '<div id="shpClNums_' + uid + '" style="position:absolute;inset:0;pointer-events:none;"></div>' +
      '</div>' +
      '<div class="shp-cl-clear-row">' +
        '<button class="shp-cl-clear-link" id="shpClClear_' + uid + '">✕ CLEAR</button>' +
      '</div>' +
      '<div class="shp-cl-btn-row">' +
        '<button id="shpClCancel_' + uid + '">CANCEL</button>' +
        '<button id="shpClOk_' + uid + '">OK</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(bd);

  /* Build the clock instance */
  var C  = 134;
  var RL = 100; // label radius
  var RF = 93;  // free tip radius
  var RTO= 124;
  var RTM= 113;
  var RTN= 119;
  var BIG= 17;
  var SM = 8;

  var ids = {
    backdrop: bd,
    picker  : document.getElementById('shp-clock-picker'),
    segH    : document.getElementById('shpClH_'+uid),
    segM    : document.getElementById('shpClM_'+uid),
    btnAM   : document.getElementById('shpClAM_'+uid),
    btnPM   : document.getElementById('shpClPM_'+uid),
    wrap    : document.getElementById('shpClWrap_'+uid),
    svg     : document.getElementById('shpClSvg_'+uid),
    tick    : document.getElementById('shpClTick_'+uid),
    needle  : document.getElementById('shpClNeedle_'+uid),
    tipG    : document.getElementById('shpClTip_'+uid),
    tipC    : document.getElementById('shpClTipC_'+uid),
    tipT    : document.getElementById('shpClTipT_'+uid),
    nums    : document.getElementById('shpClNums_'+uid),
    clear   : document.getElementById('shpClClear_'+uid),
    cancel  : document.getElementById('shpClCancel_'+uid),
    ok      : document.getElementById('shpClOk_'+uid)
  };

  /* ── State local to this instance ── */
  var state = {
    h: window._shpClH,
    m: window._shpClM,
    ap: window._shpClAP,
    mode: 'hour',
    angle: 0,
    acc: 0,
    dragging: false,
    raf: null,
    minStep: 5
  };
  state.angle = _shpHAngle(state.h);
  state.acc   = state.angle;

  /* ── Polar helper ── */
  function polar(deg, r) {
    var rad = (deg-90)*Math.PI/180;
    return { x: C+r*Math.cos(rad), y: C+r*Math.sin(rad) };
  }
  function wrap360(a) { a=a%360; return a<0?a+360:a; }
  function unwrap(raw,prev) {
    var d=raw-wrap360(prev);
    if(d>180)d-=360; if(d<-180)d+=360;
    return prev+d;
  }

  /* ── Display update ── */
  function syncDisplay() {
    ids.segH.textContent = _shpPad(state.h);
    ids.segM.textContent = _shpPad(state.m);
  }
  function syncSeg() {
    ids.segH.className = 'shp-cl-seg' + (state.mode==='hour'?' active':'');
    ids.segM.className = 'shp-cl-seg' + (state.mode==='minute'?' active':'');
  }
  function syncAP() {
    ids.btnAM.className = 'shp-cl-ampm-btn' + (state.ap==='AM'?' active':'');
    ids.btnPM.className = 'shp-cl-ampm-btn' + (state.ap==='PM'?' active':'');
  }

  /* ── Needle placement ── */
  function placeNeedle(deg) {
    var labeled = state.mode==='hour' ? true : (Math.round(wrap360(deg)/6)%60)%5===0;
    var tipR    = labeled ? RL : RF;
    var tip     = polar(deg, tipR);
    ids.needle.setAttribute('x2', tip.x);
    ids.needle.setAttribute('y2', tip.y);
    ids.tipG.setAttribute('transform','translate('+tip.x+','+tip.y+')');
    if (labeled) {
      ids.tipC.setAttribute('r', BIG);
      if (state.mode==='hour') {
        var hv=Math.round(wrap360(deg)/30)%12||12;
        ids.tipT.textContent=hv;
      } else {
        var mv=Math.round(wrap360(deg)/6)%60;
        mv=Math.round(mv/state.minStep)*state.minStep%60;
        ids.tipT.textContent=_shpPad(mv);
      }
      ids.tipT.setAttribute('font-size','14');
    } else {
      ids.tipC.setAttribute('r', SM);
      ids.tipT.textContent='';
    }
  }

  /* ── Smooth animation ── */
  function animTo(target) {
    if(state.raf){cancelAnimationFrame(state.raf);state.raf=null;}
    var start=state.angle;
    var diff=((target-start)%360+540)%360-180;
    var dur=180, t0=performance.now();
    var ease=function(t){return t<.5?2*t*t:-1+(4-2*t)*t;};
    function step(now){
      var t=Math.min((now-t0)/dur,1);
      var deg=start+diff*ease(t);
      state.angle=deg; placeNeedle(deg);
      if(t<1) state.raf=requestAnimationFrame(step);
      else { state.angle=wrap360(target); placeNeedle(state.angle); state.raf=null; }
    }
    state.raf=requestAnimationFrame(step);
  }

  /* ── Sync hidden labels ── */
  function syncHidden() {
    var els=ids.nums.querySelectorAll('.shp-cl-num');
    if(state.mode==='hour'){
      els.forEach(function(el,i){
        var sel=(i+1)===state.h;
        el.classList.toggle('hidden-svg',sel);
        el.style.pointerEvents=sel?'none':'auto';
      });
    } else {
      var onL=state.m%5===0;
      els.forEach(function(el,i){
        var sel=onL&&(i*5)===state.m;
        el.classList.toggle('hidden-svg',sel);
        el.style.pointerEvents=sel?'none':'auto';
      });
    }
  }

  /* ── Build clock face ── */
  function buildFace(doAnim, overrideTarget) {
    ids.nums.innerHTML=''; ids.tick.innerHTML='';
    var target=overrideTarget!==undefined?overrideTarget:
      (state.mode==='hour'?_shpHAngle(state.h):(state.m/60)*360);
    if(state.mode==='hour'){
      for(var i=1;i<=12;i++){
        var p=polar(_shpHAngle(i),RL);
        var el=document.createElement('div');
        el.className='shp-cl-num'+(i===state.h?' hidden-svg':'');
        el.textContent=i; el.style.left=p.x+'px'; el.style.top=p.y+'px';
        el.style.pointerEvents='auto';
        ids.nums.appendChild(el);
      }
    } else {
      for(var t=0;t<60;t++){
        var ang=(t/60)*360, main=t%5===0;
        var p1=polar(ang,RTO), p2=polar(ang,main?RTM:RTN);
        var ln=document.createElementNS('http://www.w3.org/2000/svg','line');
        ln.setAttribute('x1',p1.x);ln.setAttribute('y1',p1.y);
        ln.setAttribute('x2',p2.x);ln.setAttribute('y2',p2.y);
        ln.setAttribute('stroke',main?'#888':'#bbb');
        ln.setAttribute('stroke-width',main?'2':'1');
        ln.setAttribute('stroke-linecap','round');
        ids.tick.appendChild(ln);
      }
      for(var mn=0;mn<60;mn+=5){
        var pp=polar((mn/60)*360,RL);
        var el2=document.createElement('div');
        el2.className='shp-cl-num'+(mn===state.m?' hidden-svg':'');
        el2.textContent=_shpPad(mn); el2.style.left=pp.x+'px'; el2.style.top=pp.y+'px';
        el2.style.pointerEvents='auto';
        ids.nums.appendChild(el2);
      }
    }
    if(doAnim) animTo(target);
    else { state.angle=wrap360(target); placeNeedle(state.angle); }
    syncHidden();
  }

  /* ── Pointer math ── */
  function getRawAngle(e) {
    var r=ids.wrap.getBoundingClientRect();
    var cx=r.left+r.width/2, cy=r.top+r.height/2;
    var pt=e.touches?e.touches[0]:(e.changedTouches?e.changedTouches[0]:e);
    var a=Math.atan2(pt.clientY-cy, pt.clientX-cx)*180/Math.PI+90;
    return wrap360(a);
  }

  /* ── Events ── */
  ids.segH.addEventListener('click', function(){ switchMode('hour'); });
  ids.segM.addEventListener('click', function(){ switchMode('minute'); });
  ids.btnAM.addEventListener('click', function(){ setAP('AM'); });
  ids.btnPM.addEventListener('click', function(){ setAP('PM'); });
  ids.clear.addEventListener('click',  function(){ doClose(null); });
  ids.cancel.addEventListener('click', function(){ doClose(undefined); });
  ids.ok.addEventListener('click', function(){ doConfirm(); });
  bd.addEventListener('pointerdown', function(e){ if(e.target===bd) doClose(undefined); });

  function switchMode(m) {
    if(state.mode===m)return;
    state.mode=m; syncSeg();
    var t=m==='hour'?_shpHAngle(state.h):(state.m/60)*360;
    state.angle=t; state.acc=t;
    buildFace(true,t);
  }
  function setAP(ap){ state.ap=ap; syncAP(); }

  /* ── Pointer drag ── */
  function onPointerDown(e){
    e.preventDefault();
    var raw=getRawAngle(e);
    if(state.mode==='hour'){
      var hv=Math.round(raw/30)%12||12;
      state.h=hv; syncDisplay();
      animTo(_shpHAngle(hv));
    } else {
      var mv=Math.round(raw/6)%60; if(mv<0)mv+=60;
      mv=Math.round(mv/state.minStep)*state.minStep%60;
      state.m=mv; syncDisplay();
      animTo((mv/60)*360);
    }
    syncHidden();
    state.dragging=true; state.acc=unwrap(raw,state.angle);
    ids.wrap.classList.add('dragging');
  }
  function onMove(e){
    if(!state.dragging)return; e.preventDefault();
    var raw=getRawAngle(e);
    state.acc=unwrap(raw,state.acc);
    var vis=wrap360(state.acc);
    state.angle=vis; placeNeedle(vis);
    if(state.mode==='hour'){
      var hv=Math.round(vis/30)%12||12;
      if(hv!==state.h){state.h=hv;syncDisplay();}
    } else {
      var mv=Math.round(vis/6)%60; if(mv<0)mv+=60;
      mv=Math.round(mv/state.minStep)*state.minStep%60;
      if(mv!==state.m){state.m=mv;syncDisplay();}
    }
    syncHidden();
  }
  function onEnd(e){
    if(!state.dragging)return; state.dragging=false;
    ids.wrap.classList.remove('dragging');
    var snap=state.mode==='hour'?_shpHAngle(state.h):(state.m/60)*360;
    state.acc=snap; animTo(snap);
  }

  ids.wrap.addEventListener('pointerdown',onPointerDown,{passive:false});
  ids.wrap.addEventListener('touchstart',onPointerDown,{passive:false});
  document.addEventListener('pointermove',onMove,{passive:false});
  document.addEventListener('pointerup',onEnd);
  document.addEventListener('pointercancel',onEnd);
  document.addEventListener('touchmove',onMove,{passive:false});
  document.addEventListener('touchend',onEnd);
  document.addEventListener('touchcancel',onEnd);

  /* ── Keyboard ── */
  ids.picker.addEventListener('keydown', function(e){
    if(e.key==='Escape'){doClose(undefined);return;}
    if(e.key==='Enter'&&document.activeElement===ids.ok){doConfirm();return;}
    if(e.key==='Enter'&&document.activeElement===ids.cancel){doClose(undefined);return;}
    var ae=document.activeElement;
    if(ae===ids.segH){
      if(e.key==='ArrowUp'){state.h=state.h%12+1;animTo(_shpHAngle(state.h));syncDisplay();syncHidden();e.preventDefault();}
      if(e.key==='ArrowDown'){state.h=(state.h-2+12)%12+1;animTo(_shpHAngle(state.h));syncDisplay();syncHidden();e.preventDefault();}
    }
    if(ae===ids.segM){
      if(e.key==='ArrowUp'){state.m=(state.m+state.minStep)%60;animTo((state.m/60)*360);syncDisplay();syncHidden();e.preventDefault();}
      if(e.key==='ArrowDown'){state.m=(state.m-state.minStep+60)%60;animTo((state.m/60)*360);syncDisplay();syncHidden();e.preventDefault();}
    }
  });

  /* ── Close / confirm ── */
  function cleanup(){
    document.removeEventListener('pointermove',onMove);
    document.removeEventListener('pointerup',onEnd);
    document.removeEventListener('pointercancel',onEnd);
    document.removeEventListener('touchmove',onMove);
    document.removeEventListener('touchend',onEnd);
    document.removeEventListener('touchcancel',onEnd);
    if(state.raf){cancelAnimationFrame(state.raf);state.raf=null;}
    bd.remove();
  }
  function doClose(val){
    if(val===null && window._shpClCb) window._shpClCb('');
    cleanup();
  }
  function doConfirm(){
    var hh=state.h;
    if(state.ap==='PM'&&hh!==12)hh+=12;
    if(state.ap==='AM'&&hh===12)hh=0;
    var ts=_shpPad(hh)+':'+_shpPad(state.m)+':00';
    if(window._shpClCb) window._shpClCb(ts);
    cleanup();
  }

  /* ── Init ── */
  syncAP(); syncSeg(); syncDisplay();
  buildFace(false);
  ids.picker.focus();

  /* Auto-switch to minute after picking hour */
  ids.wrap.addEventListener('pointerup', function(){
    if(state.mode==='hour'&&!state.dragging){
      setTimeout(function(){ switchMode('minute'); },350);
    }
  });
}

/* ── Shared helpers ── */
function _shpPad(n){ return String(n).padStart(2,'0'); }
function _shpHAngle(h){ return ((h%12)/12)*360; }

/* ── Aliases (used by old call sites) ── */
function closeTpOverlay(){ var b=document.getElementById('shp-clock-backdrop'); if(b)b.remove(); }
function tpConfirm(){ /* no-op: handled inside the instance */ }
function tpClear()  { /* no-op: handled inside the instance */ }
function stpClose() { closeTpOverlay(); }

/* ═══════════════════════════════════════════════════════════════════════
   SURGICAL CARD UPDATE  — only updates inner DOM of the changed card.
   NEVER calls renderAttendanceSheet(). This is the permanent fix for
   the "time disappears after 250ms" bug.
═══════════════════════════════════════════════════════════════════════ */
function attCardTimeSet(empId, field, value) {
  var emp = app.employees.find(function(e){ return e.id===empId; });
  if(!emp) return;
  var pa = currentAttendancePendingChanges[empId];
  if(!pa) return;

  /* Commit new value */
  pa[field] = value || null;
  pa.manual_override = true;

  /* Recalc break */
  if(field.indexOf('break_')===0){
    if(pa.break_start && pa.break_end){
      var bs=new Date('1970-01-01T'+pa.break_start);
      var be=new Date('1970-01-01T'+pa.break_end);
      pa.total_break=be>bs?Math.round((be-bs)/60000):0;
    } else { pa.total_break=0; }
  }

  /* Recalc hours/pay */
  if(pa.clock_in && pa.clock_out){
    if(typeof calculateDailyHours==='function')
      calculateDailyHours(pa, emp.dutyHours||12, emp.wage||0);
  } else { pa.hours=0; pa.pay=0; }

  hasUnsavedAttendanceChanges=true;
  updateAttendanceSheetSaveButton();

  /* Find the card in DOM — bail out if it's not visible (desktop table) */
  var card=document.getElementById('att-card-'+empId);
  if(!card) return;

  var ciVal=pa.clock_in   ? formatTime(pa.clock_in)   :null;
  var coVal=pa.clock_out  ? formatTime(pa.clock_out)  :null;
  var bsVal=pa.break_start? formatTime(pa.break_start):null;
  var beVal=pa.break_end  ? formatTime(pa.break_end)  :null;
  var hrs=(pa.hours||0).toFixed(1);
  var pay=pa.pay||0;
  var brk=pa.total_break||0;

  function mkBtn(empId,field,val,label,display,disabled){
    return '<button class="att-time-btn'+(val?' has-value':'')+(disabled?' disabled':'')+'" '+
      (disabled?'disabled':
        'onclick="shpTimePicker(\''+empId+'\',\''+field+'\',\''+(val||'')+'\',\''+label+'\','+
        'function(v){attCardTimeSet(\''+empId+'\',\''+field+'\',v)})"')+'>'+
      '<span>'+display+'</span>'+
      '<span style="font-size:10px;color:#b2bec3">›</span>'+
    '</button>';
  }

  /* Times row */
  var timesEl=card.querySelector('.att-card-times');
  if(timesEl){
    timesEl.innerHTML=
      '<div class="att-time-field">'+
        '<div class="att-time-label">⏰ Clock In</div>'+
        mkBtn(empId,'clock_in',ciVal,'Clock In',ciVal||'Tap to set',false)+
      '</div>'+
      '<div class="att-time-field">'+
        '<div class="att-time-label">🏁 Clock Out</div>'+
        mkBtn(empId,'clock_out',coVal,'Clock Out',coVal||(ciVal?'Tap to set':'—'),!ciVal)+
      '</div>';
  }

  /* Break row */
  var breakEl=card.querySelector('.att-card-break-row');
  if(breakEl){
    breakEl.innerHTML=
      '<div class="att-time-field">'+
        '<div class="att-time-label">☕ Break Start</div>'+
        mkBtn(empId,'break_start',bsVal,'Break Start',bsVal||(ciVal?'Optional':'—'),!ciVal)+
      '</div>'+
      '<div class="att-time-field">'+
        '<div class="att-time-label">🔄 Break End</div>'+
        mkBtn(empId,'break_end',beVal,'Break End',beVal||(bsVal?'Tap to set':'—'),!bsVal)+
      '</div>'+
      '<div class="att-time-field">'+
        '<div class="att-time-label">⏱ Break</div>'+
        '<div style="padding:10px 12px;background:#e4e9f0;border-radius:10px;font-size:13px;font-weight:700;color:#636e72;min-height:40px;display:flex;align-items:center;box-shadow:inset 2px 2px 5px rgba(163,177,198,.45),inset -2px -2px 5px rgba(255,255,255,.85)">'+
          (brk>0?brk+' min':'—')+
        '</div>'+
      '</div>';
  }

  /* Summary */
  var sumEl=card.querySelector('.att-summary-bar');
  if(sumEl){
    sumEl.innerHTML=
      '<div class="att-summary-item">'+
        '<div class="att-summary-val">'+hrs+'h</div>'+
        '<div class="att-summary-lbl">Hours</div>'+
      '</div>'+
      '<div class="att-summary-item">'+
        '<div class="att-summary-val" style="color:#636e72">'+formatCurrency(emp.wage||0)+'</div>'+
        '<div class="att-summary-lbl">Rate/hr</div>'+
      '</div>'+
      '<div class="att-summary-item pay-val">'+
        '<div class="att-summary-val">'+(pay>0?formatCurrency(pay):'—')+'</div>'+
        '<div class="att-summary-lbl">Today\'s Pay</div>'+
      '</div>';
  }
}

function attCardNoteSet(empId, note) {
  var pa=currentAttendancePendingChanges[empId];
  if(!pa)return;
  pa.note=(note||'').trim();
  pa.manual_override=true;
  hasUnsavedAttendanceChanges=true;
  updateAttendanceSheetSaveButton();
}

function renderSingleAttCard(emp){ renderAttendanceSheet(); }

/* ── attTableTimeSet: updates the desktop table row after clock-picker OK ── */
function attTableTimeSet(empId, field, value) {
  var emp = app.employees.find(function(e){ return e.id === empId; });
  if (!emp) return;
  var pa = currentAttendancePendingChanges[empId];
  if (!pa) return;

  pa[field] = value || null;
  pa.manual_override = true;

  if (field.indexOf('break_') === 0) {
    if (pa.break_start && pa.break_end) {
      var bs = new Date('1970-01-01T' + pa.break_start);
      var be = new Date('1970-01-01T' + pa.break_end);
      pa.total_break = be > bs ? Math.round((be - bs) / 60000) : 0;
    } else { pa.total_break = 0; }
  }
  if (pa.clock_in && pa.clock_out) {
    if (typeof calculateDailyHours === 'function')
      calculateDailyHours(pa, emp.dutyHours || 12, emp.wage || 0);
  } else { pa.hours = 0; pa.pay = 0; }

  hasUnsavedAttendanceChanges = true;
  updateAttendanceSheetSaveButton();

  /* Re-render only this table row's time cells without touching anything else */
  var row = document.getElementById('att-row-' + empId);
  if (!row) { renderAttendanceSheet(); return; }

  var cells = row.querySelectorAll('td');
  /* cells: 0=#, 1=staff, 2=rate, 3=status, 4=clockIn, 5=clockOut, 6=break, 7=hours, 8=pay, 9=note, 10=actions */

  function tpBtnInner(fld, val, lbl, disabled) {
    var display = val ? formatTime(val) : '—';
    var hasVal  = !!val;
    var style = 'padding:5px 8px;border:none;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;min-width:58px;text-align:center;transition:all .15s;' +
      (disabled ? 'background:#e4e9f0;color:#b2bec3;opacity:.5;cursor:not-allowed;'
       : hasVal  ? 'background:#ede9ff;color:#6c5ce7;box-shadow:2px 2px 5px rgba(163,177,198,.4),-2px -2px 5px rgba(255,255,255,.8);cursor:pointer;'
                 : 'background:#e4e9f0;color:#95a5a6;box-shadow:2px 2px 5px rgba(163,177,198,.4),-2px -2px 5px rgba(255,255,255,.8);cursor:pointer;');
    var oc = disabled ? '' : 'onclick="shpTimePicker(\'' + empId + '\',\'' + fld + '\',\'' + (val||'') + '\',\'' + lbl + '\',function(v){attTableTimeSet(\'' + empId + '\',\'' + fld + '\',v)})"';
    return '<button style="' + style + '" ' + (disabled ? 'disabled' : '') + ' ' + oc + '>' + display + '</button>';
  }

  var canTime = pa.status === 'present' || pa.status === 'half';

  /* Clock In cell */
  if (cells[4]) cells[4].innerHTML = tpBtnInner('clock_in', pa.clock_in, 'Clock In', !canTime);
  /* Clock Out cell */
  if (cells[5]) cells[5].innerHTML = tpBtnInner('clock_out', pa.clock_out, 'Clock Out', !canTime || !pa.clock_in);
  /* Break cell */
  if (cells[6]) {
    cells[6].innerHTML =
      '<div style="display:flex;flex-direction:column;gap:4px;">' +
        tpBtnInner('break_start', pa.break_start, 'Break Start', !canTime || !pa.clock_in) +
        tpBtnInner('break_end',   pa.break_end,   'Break End',   !canTime || !pa.break_start) +
        '<span style="font-size:9px;color:#95a5a6;text-align:center;">' + (pa.total_break > 0 ? pa.total_break + ' min' : '') + '</span>' +
      '</div>';
  }
  /* Hours cell */
  if (cells[7]) {
    cells[7].style.fontWeight = '700';
    cells[7].textContent = (pa.hours || 0).toFixed(1) + 'h';
  }
  /* Pay cell */
  if (cells[8]) {
    cells[8].className = pa.pay > 0 ? 'ma-pay amp' : 'ma-pay';
    cells[8].textContent = pa.pay > 0 ? formatCurrency(pa.pay) : '—';
  }
}

/* ── FIXED calculateDailyHours override (handles overnight shifts) ── */
function calculateDailyHours(attendance, dutyHours, wage) {
  if (!attendance.clock_in || !attendance.clock_out) return;

  var start = new Date('1970-01-01T' + attendance.clock_in);
  var end   = new Date('1970-01-01T' + attendance.clock_out);

  /* Overnight: if end <= start, add 24h to end (e.g. 12:00→00:00 = 12h) */
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  var totalMinutes = (end - start) / 60000;
  totalMinutes -= (attendance.total_break || 0);

  var totalHours = Math.max(0, totalMinutes / 60);
  attendance.hours = parseFloat(totalHours.toFixed(2));

  var duty = dutyHours || 12;
  if (totalHours > duty) {
    attendance.overtime_hours = parseFloat((totalHours - duty).toFixed(2));
    attendance.regular_hours  = duty;
  } else {
    attendance.overtime_hours = 0;
    attendance.regular_hours  = totalHours;
  }

  var w = wage || 0;
  attendance.pay = Math.round(
    attendance.regular_hours  * w +
    attendance.overtime_hours * w * 1.5
  );
}

/* ═══════════════════════════════════════════════════════════════════
   attEditHours — called when user edits the hours input in the
   attendance table. Updates pay, adjusts Clock Out to match, marks
   unsaved. Does NOT re-render the whole sheet.
═══════════════════════════════════════════════════════════════════ */
function attEditHours(empId, newHours) {
  var emp = app.employees.find(function(e){ return e.id === empId; });
  if (!emp) return;
  var pa = currentAttendancePendingChanges[empId];
  if (!pa) return;

  /* Clamp */
  if (newHours < 0)  newHours = 0;
  if (newHours > 24) newHours = 24;

  pa.hours          = parseFloat(newHours.toFixed(2));
  pa.regular_hours  = pa.hours;
  pa.overtime_hours = 0;
  pa.manual_override= true;

  /* Recalculate pay */
  var wage = emp.wage || 0;
  pa.pay   = Math.round(pa.hours * wage);

  /* Adjust Clock Out = Clock In + hours + break */
  if (pa.clock_in) {
    var ciParts  = pa.clock_in.split(':');
    var ciMins   = parseInt(ciParts[0],10)*60 + parseInt(ciParts[1],10);
    var breakMin = pa.total_break || 0;
    var eoMins   = (ciMins + Math.round(pa.hours * 60) + breakMin) % 1440;
    var newCoH   = Math.floor(eoMins / 60);
    var newCoM   = eoMins % 60;
    pa.clock_out = String(newCoH).padStart(2,'0') + ':' + String(newCoM).padStart(2,'0') + ':00';
  }

  hasUnsavedAttendanceChanges = true;
  updateAttendanceSheetSaveButton();

  /* ── Surgical DOM updates — NO full re-render ── */

  /* 1. Update pay cell */
  var payCell = document.getElementById('att-pay-' + empId);
  if (payCell) {
    if (pa.pay > 0) {
      payCell.className = 'ma-pay amp';
      payCell.textContent = formatCurrency(pa.pay);
    } else {
      payCell.className = 'ma-pay';
      payCell.textContent = '—';
    }
  }

  /* 2. Update Clock Out button in the table row (cell index 5) */
  var row = document.getElementById('att-row-' + empId);
  if (row && pa.clock_out) {
    var cells   = row.querySelectorAll('td');
    var coCell  = cells[5];
    if (coCell) {
      /* Rebuild the clock-out tap button with the new value */
      var coVal   = formatTime(pa.clock_out);
      var coStyle = 'padding:5px 8px;border:none;border-radius:8px;font-size:11px;font-weight:700;' +
                    'white-space:nowrap;min-width:58px;text-align:center;cursor:pointer;' +
                    'background:#ede9ff;color:#6c5ce7;' +
                    'box-shadow:2px 2px 5px rgba(163,177,198,.4),-2px -2px 5px rgba(255,255,255,.8);';
      coCell.innerHTML = '<button style="' + coStyle + '" ' +
        'onclick="shpTimePicker(\'' + empId + '\',\'clock_out\',\'' + (pa.clock_out||'') + '\',' +
        '\'Clock Out\',function(v){attTableTimeSet(\'' + empId + '\',\'clock_out\',v)})">' +
        coVal + '</button>';
    }
  }

  /* 3. Update the mobile card summary bar if visible */
  var card  = document.getElementById('att-card-' + empId);
  if (card) {
    var sumEl = card.querySelector('.att-summary-bar');
    if (sumEl) {
      sumEl.innerHTML =
        '<div class="att-summary-item">' +
          '<div class="att-summary-val">' + pa.hours.toFixed(1) + 'h</div>' +
          '<div class="att-summary-lbl">Hours</div>' +
        '</div>' +
        '<div class="att-summary-item">' +
          '<div class="att-summary-val" style="color:#636e72">' + formatCurrency(emp.wage||0) + '</div>' +
          '<div class="att-summary-lbl">Rate/hr</div>' +
        '</div>' +
        '<div class="att-summary-item pay-val">' +
          '<div class="att-summary-val">' + (pa.pay > 0 ? formatCurrency(pa.pay) : '—') + '</div>' +
          '<div class="att-summary-lbl">Today\'s Pay</div>' +
        '</div>';
    }
  }

  /* 4. Update the running total in the footer */
  var totalH = 0, totalP = 0;
  app.employees.forEach(function(e) {
    var p = currentAttendancePendingChanges[e.id];
    if (p) { totalH += p.hours || 0; totalP += p.pay || 0; }
  });
  var totalEl = document.getElementById('attendance-total-summary');
  if (totalEl) {
    totalEl.innerHTML = '📊 <span class="amp">' + totalH.toFixed(1) + 'h</span> · ' +
      '<span class="amp">' + formatCurrency(totalP) + '</span> · ' +
      app.employees.length + ' staff';
  }

  /* 5. Update the hours summary stat box */
  var sumStats = document.getElementById('attendance-summary-stats');
  if (sumStats) {
    var hEl = sumStats.querySelector('.msv[data-type="hours"]');
    if (hEl) hEl.textContent = totalH.toFixed(1) + 'h';
  }
}
