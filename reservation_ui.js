/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: reservation_ui.js – Reservation modal and list UI                    ║
║         (Fixed: always show all tables in dropdown, conflict check on save) ║
║         (Added renderAllTables after save/cancel to update table colors)    ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

/* ── Reservation time-picker helpers ─────────────────────────────────────── */
function resOpenTimePicker(which) {
  var currentRaw = document.getElementById('res-' + which).value; // "HH:MM" or ""
  var label = which === 'start' ? 'Start Time' : 'End Time';
  // shpTimePicker expects "HH:MM:SS" format
  var val24 = '';
  if (currentRaw && currentRaw.length >= 4) val24 = currentRaw + ':00';
  shpTimePicker(null, 'res_' + which, val24, label, function(v) {
    // v comes back as "HH:MM:SS" in 24h
    if (!v) return; // cleared / cancelled
    var hhmm = v.substring(0, 5); // "HH:MM"
    document.getElementById('res-' + which).value = hhmm;
    document.getElementById('res-' + which + '-display').textContent = formatResTime12(hhmm);
    document.getElementById('res-' + which + '-display').style.color = 'var(--text-primary)';
    if (which === 'start') updateEndTime();
  });
}

function formatResTime12(hhmm) {
  if (!hhmm) return '—';
  var parts = hhmm.split(':');
  var h = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
  var ap = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12; if (h === 0) h = 12;
  return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
}

function openReservationModal() {
  document.getElementById('reservation-modal').classList.add('active');
  // Default to today, next hour
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  var nextH = now.getHours() + 1; if (nextH > 23) nextH = 23;
  const nextHour = String(nextH).padStart(2, '0') + ':00';
  document.getElementById('res-date').value = today;
  document.getElementById('res-start').value = nextHour;
  document.getElementById('res-start-display').textContent = formatResTime12(nextHour);
  document.getElementById('res-start-display').style.color = 'var(--text-primary)';
  updateEndTime();
  populateTableDropdown();
  populateClientSelect('res-client-select');
  document.getElementById('res-people').value = 2;
  document.getElementById('res-notes').value = '';
  switchResTab('new');
  setupEnterKeyOnModal('reservation-modal', '.save');
}

function switchResTab(tab) {
  document.querySelectorAll('.res-tab-content').forEach(el => el.style.display = 'none');
  document.getElementById(`res-tab-${tab}`).style.display = 'block';
  if (tab === 'list') renderReservationList();
  if (tab === 'calendar') {
    setTimeout(initReservationCalendar, 100); // allow DOM update
  }
}

function updateEndTime() {
  const start = document.getElementById('res-start').value;
  if (!start) return;
  const dur = appSettings.reservation.defaultDuration;
  const end = calculateEndTime(start, dur);
  document.getElementById('res-end').value = end;
  const endDisplay = document.getElementById('res-end-display');
  if (endDisplay) {
    endDisplay.textContent = formatResTime12(end) + ' (auto)';
    endDisplay.style.color = 'var(--text-secondary)';
  }
}

// ============================================================================
// FIX: Populate dropdown with ALL unique tables from tableLayout
// ============================================================================
function populateTableDropdown() {
  const allTables = [];
  // Loop through tableLayout (global) to collect all table names
  if (typeof tableLayout !== 'undefined' && tableLayout.length) {
    tableLayout.forEach(zone => {
      zone.sections.forEach(section => {
        section.tables.forEach(t => {
          const tName = typeof t === 'string' ? t : t.name;
          if (!allTables.includes(tName)) allTables.push(tName);
        });
      });
    });
  }
  
  const select = document.getElementById('res-table');
  select.innerHTML = '';
  
  if (allTables.length === 0) {
    select.innerHTML = '<option value="">No tables defined</option>';
  } else {
    allTables.sort((a, b) => a.localeCompare(b));
    allTables.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      select.appendChild(opt);
    });
  }
  
  // Re-initialize the custom select if the app uses it
  if (typeof initializeCustomSelect === 'function') {
    initializeCustomSelect('res-table');
  }
}

// Date change still refreshes table dropdown
document.getElementById('res-date').addEventListener('change', populateTableDropdown);

function saveReservation() {
  const date = document.getElementById('res-date').value;
  const start = document.getElementById('res-start').value;
  const end = document.getElementById('res-end').value;
  const table = document.getElementById('res-table').value;
  const people = parseInt(document.getElementById('res-people').value) || 1;
  const clientId = document.getElementById('res-client-select').value || null;
  const clientName = document.getElementById('res-client-name').value;
  const clientPhone = document.getElementById('res-client-phone').value;
  const notes = document.getElementById('res-notes').value;
  
  if (!date || !start || !end || !table) {
    return showToast('Please fill all required fields');
  }
  
  // Check for conflict if overbooking is not allowed
  if (!appSettings.reservation.allowOverbooking) {
    if (!isTableFree(table, date, start, end)) {
      openConfirm('Table Already Reserved',
        'This table is already reserved for the selected time. Override?',
        () => proceedSaveReservation(date, start, end, table, people, clientId, clientName, clientPhone, notes)
      );
      return;
    }
  }
  
  // No conflict or overbooking allowed → save directly
  proceedSaveReservation(date, start, end, table, people, clientId, clientName, clientPhone, notes);
}

function proceedSaveReservation(date, start, end, table, people, clientId, clientName, clientPhone, notes) {
  // If clientId is empty but name/phone provided, create new client
  let finalClientId = clientId;
  if (!clientId && clientName && clientPhone) {
    finalClientId = 'CL-' + Date.now();
    app.clients.push({
      id: finalClientId,
      name: clientName,
      phone: clientPhone,
      company: '',
      address: '',
      limit: 0,
      balance: 0,
      totalOrders: 0,
      totalDiscount: 0,
      totalPurchasing: 0,
      favorites: {},
      ledger: [],
      isBlocked: false,
      rating: 5,
      loyaltyPoints: 0,
      pointsHistory: []
    });
    localStorage.setItem('pos_clients', JSON.stringify(app.clients));
  }
  
  const reservation = {
    id: 'RES-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    date,
    startTime: start,
    endTime: end,
    tableName: table,
    people,
    clientId: finalClientId,
    clientName: clientName || '',
    clientPhone: clientPhone || '',
    notes,
    status: 'confirmed'
  };
  app.reservations.push(reservation);
  localStorage.setItem('pos_reservations', JSON.stringify(app.reservations));
  closeModal('reservation-modal');
  showToast('Reservation saved');
  
  // 🔁 Force table re-render to update reservation indicators
  if (typeof renderAllTables === 'function') renderAllTables();
  if (typeof refreshCalendar === 'function') refreshCalendar();
}

function renderReservationList() {
  const list = document.getElementById('reservation-list');
  list.innerHTML = '';
  const reservations = [...app.reservations].filter(r => r.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  if (reservations.length === 0) {
    list.innerHTML = '<p style="text-align:center; padding:20px;">No reservations</p>';
    return;
  }
  reservations.forEach(r => {
    const item = document.createElement('div');
    item.className = 'reservation-list-item';
    item.style.cssText = 'border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:10px;';
    // Get client name
    let clientDisplay = 'Walk-in';
    if (r.clientId) {
      const c = app.clients.find(cl => cl.id === r.clientId);
      if (c) clientDisplay = c.name;
    } else if (r.clientName) {
      clientDisplay = r.clientName;
    }
    item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${r.tableName}</strong> – ${r.date} ${r.startTime} (${r.people} ppl)
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-modern" style="padding:6px 12px; font-size:0.8rem;" onclick="serveReservedTable('${r.tableName}', '${clientDisplay}')">Serve Order</button>
                    <button class="btn-modern" style="padding:6px 12px; font-size:0.8rem; background:var(--col-danger); color:white;" onclick="cancelReservation('${r.id}')">Cancel</button>
                </div>
            </div>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:5px;">${clientDisplay} · ${r.notes || 'No notes'}</div>
        `;
    list.appendChild(item);
  });
}

// Serve a reserved table – show confirmation then open order
function serveReservedTable(tableName, clientName) {
  openConfirm('Table Reserved', `This table is reserved for ${clientName}. Do you still want to open it for an order?`, () => {
    selectTable(tableName);
    showSection('items');
    closeModal('reservation-modal'); // close the reservation modal
  });
}

function cancelReservation(id) {
  const res = app.reservations.find(r => r.id === id);
  if (res) {
    res.status = 'cancelled';
    localStorage.setItem('pos_reservations', JSON.stringify(app.reservations));
    renderReservationList();
    
    // 🔁 Force table re-render to update reservation indicators
    if (typeof renderAllTables === 'function') renderAllTables();
    if (typeof refreshCalendar === 'function') refreshCalendar();
    
    showToast('Reservation cancelled');
  }
}

// Helper to populate client dropdown
function populateClientSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">-- New / Guest --</option>';
  app.clients.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.name} (${c.phone})</option>`;
  });
  if (typeof initializeCustomSelect === 'function') {
    initializeCustomSelect(selectId);
  }
}

// Auto-fill client details when a client is selected
function autoFillResClient() {
  const select = document.getElementById('res-client-select');
  const id = select.value;
  if (id) {
    const c = app.clients.find(x => x.id === id);
    if (c) {
      document.getElementById('res-client-name').value = c.name;
      document.getElementById('res-client-phone').value = c.phone;
    }
  } else {
    document.getElementById('res-client-name').value = '';
    document.getElementById('res-client-phone').value = '';
  }
}
window.resOpenTimePicker = resOpenTimePicker;
window.formatResTime12 = formatResTime12;
window.openReservationModal = openReservationModal;
window.switchResTab = switchResTab;
window.updateEndTime = updateEndTime;
window.saveReservation = saveReservation;
window.cancelReservation = cancelReservation;
window.serveReservedTable = serveReservedTable;
window.autoFillResClient = autoFillResClient;
window.populateTableDropdown = populateTableDropdown;
window.populateClientSelect = populateClientSelect;