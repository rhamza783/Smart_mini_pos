/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: pos_tables.js – Table Rendering, Selection, and Status Updates       ║
║         (Uses per‑zone display settings, handles reservations)              ║
║         (Respects per‑zone askForClient and askForWaiter)                   ║
║         (Reservation blocking with margins and confirmation)                ║
║         (VISUAL: any reservation today shows purple border + lock)          ║
║         (DEBUG: logs added)                                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

// Helper to get local date in YYYY-MM-DD format
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper to convert HH:MM to minutes since midnight
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Helper to check if a table has any reservation today (for visual indicator)
function hasReservationToday(tableName) {
    if (!app.reservations || !Array.isArray(app.reservations)) return false;
    const currentDate = getLocalDateString(new Date());
    return app.reservations.some(r =>
        r.status === 'confirmed' && r.tableName === tableName && r.date === currentDate
    );
}

// Helper to check if a table is currently blocked (including margins)
function isTableBlockedNow(tableName) {
    if (!app.reservations || !Array.isArray(app.reservations)) return false;

    const now = new Date();
    const currentDate = getLocalDateString(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const marginBefore = appSettings.reservation?.beforeMargin || 30;
    const marginAfter = appSettings.reservation?.afterMargin || 30;

    return app.reservations.some(r => {
        if (r.status !== 'confirmed' || r.tableName !== tableName || r.date !== currentDate) return false;

        const startMinutes = timeToMinutes(r.startTime);
        const endMinutes = timeToMinutes(r.endTime);
        const effectiveStart = startMinutes - marginBefore;
        const effectiveEnd = endMinutes + marginAfter;

        return currentMinutes >= effectiveStart && currentMinutes <= effectiveEnd;
    });
}

// Helper to get the first overlapping reservation for a table at current time (for popup)
function getCurrentReservationForTable(tableName) {
    if (!app.reservations || !Array.isArray(app.reservations)) return null;

    const now = new Date();
    const currentDate = getLocalDateString(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const marginBefore = appSettings.reservation?.beforeMargin || 30;
    const marginAfter = appSettings.reservation?.afterMargin || 30;

    return app.reservations.find(r => {
        if (r.status !== 'confirmed' || r.tableName !== tableName || r.date !== currentDate) return false;

        const startMinutes = timeToMinutes(r.startTime);
        const endMinutes = timeToMinutes(r.endTime);
        const effectiveStart = startMinutes - marginBefore;
        const effectiveEnd = endMinutes + marginAfter;

        return currentMinutes >= effectiveStart && currentMinutes <= effectiveEnd;
    });
}

function renderAllTables() {
    
    
    tableLayout.forEach(zone => {
        const tablesScrollContainer = document.getElementById(`${zone.id}-container`);
        if (tablesScrollContainer) {
            tablesScrollContainer.innerHTML = '';
        }
    });
    
    const textMeasureDiv = document.createElement('div');
    textMeasureDiv.style.cssText = 'position: absolute; visibility: hidden; height: auto; width: auto; white-space: nowrap; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;';
    document.body.appendChild(textMeasureDiv);
    
    tableLayout.forEach((zone) => {
        // Get zone-specific settings, fallback to dinein if missing
        const zoneSettings = appSettings.tableDisplay?.[zone.id] || appSettings.tableDisplay?.dinein;
        if (!zoneSettings) return;
        
        const zoneSectionElement = document.getElementById(`${zone.id}-section`);
        if (!zoneSectionElement) {
            console.error(`Section element for zone ID '${zone.id}-section' not found.`);
            return;
        }
        
        const tablesScrollContainer = zoneSectionElement.querySelector('.tables-scroll-container');
        if (!tablesScrollContainer) {
            console.error(`Tables scroll container for zone ID '${zone.id}-section' not found.`);
            return;
        }
        tablesScrollContainer.innerHTML = '';
        
        zone.sections.forEach((section) => {
            const sectionWrapper = document.createElement('div');
            sectionWrapper.className = 'table-section-wrapper';
            sectionWrapper.id = `section-${zone.id}-${section.name.replace(/\s+/g, '-')}`;
            
            sectionWrapper.style.setProperty('--table-group-h-gap', zoneSettings.tableGroupHGap);
            sectionWrapper.style.setProperty('--table-group-line-style', zoneSettings.tableGroupLineStyle);
            sectionWrapper.style.setProperty('--table-group-line-thickness', zoneSettings.tableGroupLineThickness);
            sectionWrapper.style.setProperty('--table-group-line-color', zoneSettings.tableGroupLineColor);
            sectionWrapper.style.setProperty('--table-group-content-vertical-padding', zoneSettings.tableGroupContentPadding);
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'table-group-header';
            headerDiv.style.color = 'var(--col-secondary)';
            headerDiv.style.fontFamily = `var(--ui-font-table-head-family, ${zoneSettings.uiFont?.tableHeaderFamily})`;
            headerDiv.style.fontStyle = `var(--ui-font-table-head-style, ${zoneSettings.uiFont?.tableHeaderStyle})`;
            
            let headerText = section.name.trim();
            if (headerText.includes(' ')) {
                headerText = headerText.replace(' ', '<br>');
            }
            headerDiv.innerHTML = `<span>${headerText}</span>`;
            
            sectionWrapper.appendChild(headerDiv);
            
            const rowDiv = document.createElement('div');
            rowDiv.className = 'fit-row';
            
            if (zoneSettings.tableBtnAutoSize) {
                rowDiv.classList.add('auto-size');
            } else {
                rowDiv.classList.remove('auto-size');
            }
            
            rowDiv.style.setProperty('--table-btn-gap', zoneSettings.tableBtnGap);
            rowDiv.style.setProperty('--table-btn-column-gap', zoneSettings.tableBtnColumnGap);
            
            section.tables.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            
            section.tables.forEach((tObj) => {
                const tName = typeof tObj === 'string' ? tObj : tObj.name;
                const btn = document.createElement('button');
                btn.className = 'table-btn empty';
                btn.setAttribute('data-table', tName);
                btn.textContent = tName;
                
                // Check if table has any reservation today → add visual indicator
                if (hasReservationToday(tName)) {
                    btn.classList.add('reserved');
                    btn.title = 'Reserved today';
                }
                
                btn.onclick = () => selectTable(tName);
                
                btn.style.setProperty('--table-button-border-radius', zoneSettings.tableButtonBorderRadius);
                
                rowDiv.appendChild(btn);
            });
            sectionWrapper.appendChild(rowDiv);
            tablesScrollContainer.appendChild(sectionWrapper);
            
            // Font sizing for heading (same as before)
            setTimeout(() => {
                const computedStyleWrapper = getComputedStyle(sectionWrapper);
                const paddingTop = parseFloat(computedStyleWrapper.getPropertyValue('--table-group-content-vertical-padding'));
                const paddingBottom = parseFloat(computedStyleWrapper.getPropertyValue('--table-group-content-vertical-padding'));
                
                const rowDivHeight = rowDiv.offsetHeight;
                const availableHeightForHeader = rowDivHeight + paddingTop + paddingBottom;
                
                const headerSpan = headerDiv.querySelector('span');
                if (headerSpan) {
                    const tempLineHeightDiv = document.createElement('div');
                    tempLineHeightDiv.style.cssText = 'position:absolute;visibility:hidden;height:auto;width:auto;white-space:nowrap;line-height:normal;';
                    tempLineHeightDiv.style.fontFamily = headerDiv.style.fontFamily;
                    tempLineHeightDiv.style.fontStyle = headerDiv.style.fontStyle;
                    tempLineHeightDiv.textContent = 'Mg';
                    document.body.appendChild(tempLineHeightDiv);
                    const estimatedLineHeight = tempLineHeightDiv.offsetHeight;
                    document.body.removeChild(tempLineHeightDiv);
                    
                    let fontSize = (availableHeightForHeader * 0.95);
                    if (estimatedLineHeight > 0) {
                        fontSize = fontSize / estimatedLineHeight;
                    }
                    
                    fontSize = Math.min(fontSize, 40);
                    fontSize = Math.max(fontSize, 8);
                    
                    headerSpan.style.fontSize = `${fontSize}px`;
                    textMeasureDiv.style.fontFamily = getComputedStyle(headerSpan).fontFamily;
                    textMeasureDiv.style.fontWeight = getComputedStyle(headerSpan).fontWeight;
                    textMeasureDiv.style.textTransform = 'uppercase';
                    
                    let currentText = headerText.replace('<br>', '');
                    textMeasureDiv.textContent = currentText;
                    
                    while (textMeasureDiv.offsetWidth > (availableHeightForHeader * 0.95) && fontSize > 5) {
                        fontSize -= 0.5;
                        headerSpan.style.fontSize = `${fontSize}px`;
                        textMeasureDiv.textContent = currentText;
                    }
                    headerDiv.style.fontSize = `${fontSize}px`;
                    
                }
            }, 100);
        });
    });
    document.body.removeChild(textMeasureDiv);
    updateTableButtons();
}

function selectTable(tableName, fromWaiterSelect = false) {
    // Exit read‑only mode if needed
    if (typeof exitReadOnlyMode === 'function') exitReadOnlyMode();

    // Permission check for creating new orders
    if (!hasPerm('createOrder') && !app.orders[tableName]) {
        return showCustomAlert("Denied", "You do not have permission to create orders.");
    }

    const orderExists = app.orders[tableName] && app.orders[tableName].items.length > 0;

    // If order already exists, just load it
    if (orderExists) {
        app.table = tableName;
        document.body.classList.remove('hide-cart');
        loadTableData();
        renderOrderList();
        showSection('items');
        startTimer();
        return;
    }

    // ---- Reservation block check (time‑based) ----
    const reservation = getCurrentReservationForTable(tableName);
    if (reservation) {
        // Build client name for display
        let clientName = 'Unknown';
        if (reservation.clientId) {
            const c = app.clients.find(cl => cl.id === reservation.clientId);
            if (c) clientName = c.name;
        } else if (reservation.clientName) {
            clientName = reservation.clientName;
        }

        // Build a rich, clear warning popup
        let clientPhone = '';
        if (reservation.clientId) {
            const c = app.clients.find(cl => cl.id === reservation.clientId);
            if (c) { clientName = c.name; clientPhone = c.phone || ''; }
        } else if (reservation.clientName) {
            clientName = reservation.clientName;
            clientPhone = reservation.clientPhone || '';
        }

        showReservationWarning(tableName, clientName, clientPhone, reservation, () => {
            proceedOpenTable(tableName, fromWaiterSelect);
        });
        return; // Stop further execution until user confirms
    }

    // No blocking reservation – proceed normally
    proceedOpenTable(tableName, fromWaiterSelect);
}

// Helper to actually open a table (called after reservation confirmation or when no blocking reservation)
function proceedOpenTable(tableName, fromWaiterSelect) {
    // Determine zone type
    let isDineIn = false;
    let isTakeawayOrDelivery = false;
    let zoneId = null;

    if (tableLayout.length > 0) {
        tableLayout.forEach(zone => {
            zone.sections.forEach(s => {
                s.tables.forEach(t => {
                    const tName = typeof t === 'string' ? t : t.name;
                    if (tName === tableName) {
                        zoneId = zone.id;
                        if (zone.id.toLowerCase().includes('takeaway') || zone.id.toLowerCase().includes('delivery')) {
                            isTakeawayOrDelivery = true;
                        } else {
                            isDineIn = true;
                        }
                    }
                });
            });
        });
    }

    const zoneSettings = appSettings.tableDisplay?.[zoneId] || appSettings.tableDisplay?.dinein || {};

    // Dine‑In without existing order → ask for waiter if configured
    if (isDineIn && !fromWaiterSelect) {
        app.pendingTable = tableName;
        if (zoneSettings.askForWaiter) {
            openWaiterModal(true, zoneSettings);
            return;
        }
        // No waiter required – create order directly
        createNewOrder(tableName, zoneSettings);
        return;
    }

    // Takeaway / Delivery without existing order → create directly (maybe ask for client later)
    if (isTakeawayOrDelivery && !fromWaiterSelect) {
        createNewOrder(tableName, zoneSettings);
        return;
    }

    // Fallback (e.g., reopening an existing order or from waiter modal)
    app.table = tableName;
    if (!app.orders[tableName]) {
        createNewOrder(tableName, zoneSettings);
    } else {
        document.body.classList.remove('hide-cart');
        loadTableData();
        renderOrderList();
        showSection('items');
        startTimer();
    }
}

function createNewOrder(tableName, zoneSettings) {
    app.table = tableName;
    app.orders[tableName] = {
        id: Date.now().toString().slice(-6),
        items: [],
        startTime: Date.now(),
        persons: 1,
        waiter: 'Staff',
        discount: 0,
        discType: 'fixed',
        customer: { name: '', phone: '', address: '' },
        clientId: null,
        notes: '',
        payments: []
    };
    document.body.classList.remove('hide-cart');
    loadTableData();
    renderOrderList();
    showSection('items');
    startTimer();
    if (zoneSettings.askForClient) {
        openCustomerModal();
    }
}

function loadTableData() {
    const data = app.orders[app.table];
    app.currentOrder = data.items;
    app.discountType = data.discType || 'fixed';
    document.getElementById('current-table-display').textContent = app.table;
    document.getElementById('order-id-display').textContent = 'Ord #' + data.id;
    document.getElementById('start-time-display').textContent = formatOrderTime(data.startTime);
    const discInput = document.getElementById('input-discount');
    if (discInput) discInput.value = data.discount || 0;
    document.getElementById('btn-waiter').innerHTML = `<i class="fas fa-user-tie"></i> ${formatWorkerName(data.waiter || "Staff")}`;

    // Load order notes into textarea
    const notesInput = document.getElementById('order-notes');
    if (notesInput) {
        notesInput.value = data.notes || '';
        notesInput.oninput = function() {
            app.orders[app.table].notes = this.value;
            localStorage.setItem('savedOrders', JSON.stringify(app.orders));
        };
    }
    
    const clientDisp = document.getElementById('cart-client-display');
    if (data.clientId) {
        const cl = app.clients.find(c => c.id === data.clientId);
        if (cl) {
            if (cl.isBlocked) {
                clientDisp.innerHTML = `Client: ${cl.name} <span style="color:var(--col-danger); font-weight:900;">[BLOCKED]</span>`;
                document.getElementById('cart-close-btn').disabled = true;
                document.getElementById('cart-close-btn').style.opacity = '0.5';
            } else {
                clientDisp.textContent = `Client: ${cl.name} (${cl.company || cl.phone})`;
                document.getElementById('cart-close-btn').disabled = false;
                document.getElementById('cart-close-btn').style.opacity = '1';
            }
            clientDisp.style.display = 'block';
        }
    } else {
        clientDisp.style.display = 'none';
        document.getElementById('cart-close-btn').disabled = false;
        document.getElementById('cart-close-btn').style.opacity = '1';
    }
}

function updateTableButtons() {
    document.querySelectorAll('.table-btn').forEach(btn => {
        const tName = btn.getAttribute('data-table');
        if (app.orders[tName] && app.orders[tName].items.length > 0) {
            btn.classList.add('occupied');
            const mins = Math.floor((Date.now() - app.orders[tName].startTime) / 60000);
            btn.innerHTML = `${tName}<br><span class="timer-display">${mins} min</span>`;
        } else {
            btn.classList.remove('occupied');
            btn.innerHTML = tName;
        }
    });
}

function startTimer() {
    if (app.timerInterval) clearInterval(app.timerInterval);
    app.timerInterval = setInterval(() => {
        if (app.isReadOnly || !app.table || !app.orders[app.table]) return;
        const diff = Math.floor((Date.now() - app.orders[app.table].startTime) / 1000);
        let display = diff < 60 ? diff + "s" : diff < 3600 ? Math.floor(diff / 60) + ":" + (diff % 60).toString().padStart(2, '0') : Math.floor(diff / 3600) + "h";
        document.getElementById('serv-time-display').textContent = display;
    }, 1000);
}
// ============================================================================
// RICH RESERVATION WARNING DIALOG
// ============================================================================
function showReservationWarning(tableName, clientName, clientPhone, reservation, onProceed) {
    // Remove any existing warning
    const old = document.getElementById('res-warning-overlay');
    if (old) old.remove();

    const fmt = function(t) {
        if (!t) return '—';
        var p = t.split(':'), h = parseInt(p[0], 10), m = parseInt(p[1], 10);
        var ap = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12; if (h === 0) h = 12;
        return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
    };

    const overlay = document.createElement('div');
    overlay.id = 'res-warning-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);padding:16px;';

    overlay.innerHTML = `
      <div style="background:var(--bg-app);border-radius:24px;padding:0;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.35);overflow:hidden;animation:rwIn .22s cubic-bezier(.175,.885,.32,1.275) both;">
        <style>@keyframes rwIn{from{opacity:0;transform:scale(.88) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}</style>

        <!-- Red header bar -->
        <div style="background:linear-gradient(135deg,#e74c3c,#c0392b);padding:18px 22px;display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🔒</div>
          <div>
            <div style="color:#fff;font-weight:800;font-size:16px;">Table Reserved</div>
            <div style="color:rgba(255,255,255,.85);font-size:12px;margin-top:2px;">Table <strong>${tableName}</strong></div>
          </div>
        </div>

        <!-- Info rows -->
        <div style="padding:18px 22px 14px;">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(231,76,60,.07);border:1px solid rgba(231,76,60,.18);border-radius:12px;">
              <span style="font-size:18px;">👤</span>
              <div>
                <div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.8px;">Reserved For</div>
                <div style="font-weight:700;color:var(--text-primary);font-size:15px;">${clientName}</div>
                ${clientPhone ? `<div style="font-size:12px;color:var(--text-secondary);">${clientPhone}</div>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:8px;">
              <div style="flex:1;padding:10px 12px;background:rgba(0,0,0,.04);border-radius:10px;text-align:center;">
                <div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px;">From</div>
                <div style="font-weight:700;color:var(--text-primary);font-size:15px;">${fmt(reservation.startTime)}</div>
              </div>
              <div style="flex:1;padding:10px 12px;background:rgba(0,0,0,.04);border-radius:10px;text-align:center;">
                <div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px;">Until</div>
                <div style="font-weight:700;color:var(--text-primary);font-size:15px;">${fmt(reservation.endTime)}</div>
              </div>
              ${reservation.people ? `<div style="flex:1;padding:10px 12px;background:rgba(0,0,0,.04);border-radius:10px;text-align:center;">
                <div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px;">Guests</div>
                <div style="font-weight:700;color:var(--text-primary);font-size:15px;">${reservation.people} 🧑</div>
              </div>` : ''}
            </div>
            ${reservation.notes ? `<div style="padding:8px 12px;background:rgba(0,0,0,.03);border-radius:8px;font-size:12px;color:var(--text-secondary);"><strong>Note:</strong> ${reservation.notes}</div>` : ''}
          </div>

          <p style="font-size:13px;color:var(--text-secondary);margin:14px 0 0;text-align:center;">Do you still want to open this table for a new order?</p>
        </div>

        <!-- Buttons -->
        <div style="display:flex;gap:10px;padding:0 22px 20px;">
          <button id="res-warn-cancel" style="flex:1;padding:13px;border:none;border-radius:12px;background:rgba(0,0,0,.07);color:var(--text-primary);font-weight:700;font-size:14px;cursor:pointer;">Cancel</button>
          <button id="res-warn-proceed" style="flex:1;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;font-weight:700;font-size:14px;cursor:pointer;">Yes, Open Table</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    document.getElementById('res-warn-cancel').onclick = function() { overlay.remove(); };
    document.getElementById('res-warn-proceed').onclick = function() { overlay.remove(); onProceed(); };
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}