/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: history_viewer.js – Order History with Date/Time Range Filter        ║
║         (Totals computed directly from filtered list, data never deleted)   ║
║         (Added Urdu waiter name support)                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

// ============================================================================
// RENDER HISTORY (with date range and text search)
// ============================================================================
function renderHistory() {
    const term = document.getElementById('hist-search').value.toLowerCase();
    const div = document.getElementById('order-history-list');
    div.innerHTML = '';

    // Get date range from inputs
    const startInput = document.getElementById('hist-start').value;
    const endInput = document.getElementById('hist-end').value;

    let startDate = startInput ? new Date(startInput) : null;
    let endDate = endInput ? new Date(endInput) : null;

    // If end date is provided, set it to the end of that day (23:59:59)
    if (endDate) {
        endDate.setHours(23, 59, 59, 999);
    }

    let allOrders = [];

    // Active orders – always included (no date filter)
    for (let tName in app.orders) {
        const o = app.orders[tName];
        if (o && o.items && o.items.length > 0) {
            let total = o.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0) - (Number(o.discount) || 0);
            allOrders.push({
                ...o,
                table: tName,
                total: total,
                isActive: true,
                date: new Date(o.startTime).toLocaleString(),
                timestamp: o.startTime,
                originalIndex: tName
            });
        }
    }

    // Closed orders – filtered by date range
    app.history.forEach((h, i) => {
        const orderTime = new Date(h.startTimeRaw || h.date).getTime();
        if (startDate && orderTime < startDate.getTime()) return;
        if (endDate && orderTime > endDate.getTime()) return;
        allOrders.push({
            ...h,
            isActive: false,
            originalIndex: i
        });
    });

    // Apply text search filter
    const filtered = allOrders.filter(h => {
        if (!term) return true;
        if (h.id && h.id.toString().toLowerCase().includes(term)) return true;
        if (h.table && h.table.toLowerCase().includes(term)) return true;
        if (h.waiter && h.waiter.toLowerCase().includes(term)) return true;
        if (h.total && h.total.toString().includes(term)) return true;
        if (h.customer && h.customer.name && h.customer.name.toLowerCase().includes(term)) return true;
        if (h.items && h.items.some(item => item.name.toLowerCase().includes(term))) return true;
        return false;
    });

    // Separate active and closed orders
    const actives = filtered.filter(f => f.isActive);
    const closeds = filtered.filter(f => !f.isActive);

    // Calculate totals from the filtered lists
    let calcActiveTotal = actives.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    let calcClosedTotal = closeds.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // Update totals display
    const activeTotalEl = document.getElementById('hist-active-total');
    const closedTotalEl = document.getElementById('hist-closed-total');
    const uiFont = appSettings.preferences.uiFont;

    if (activeTotalEl) {
        activeTotalEl.textContent = `${appSettings.property.currency} ${calcActiveTotal.toFixed(0)}`;
        activeTotalEl.style.fontFamily = `var(--ui-font-dash-num-family, ${uiFont.dashNumFamily})`;
        activeTotalEl.style.fontStyle = `var(--ui-font-dash-num-style, ${uiFont.dashNumStyle})`;
        activeTotalEl.style.fontSize = `var(--dashNumFontSize, ${appSettings.preferences.dashNumFontSize})`;
    }
    if (closedTotalEl) {
        closedTotalEl.textContent = `${appSettings.property.currency} ${calcClosedTotal.toFixed(0)}`;
        closedTotalEl.style.fontFamily = `var(--ui-font-dash-num-family, ${uiFont.dashNumFamily})`;
        closedTotalEl.style.fontStyle = `var(--ui-font-dash-num-style, ${uiFont.dashNumStyle})`;
        closedTotalEl.style.fontSize = `var(--dashNumFontSize, ${appSettings.preferences.dashNumFontSize})`;
    }

    if (filtered.length === 0) {
        div.innerHTML = "<p style='text-align:center;color:var(--text-secondary); margin-top:20px;'>No matching order found</p>";
        return;
    }

    const renderRow = (h) => {
        const borderLeft = h.isActive ? '5px solid var(--col-success)' : '5px solid transparent';
        const bg = h.isActive ? 'rgba(56, 161, 105, 0.05)' : 'var(--bg-app)';
        const statusLabel = h.isActive ? `<span style="background:var(--col-success); color:white; font-size:0.6rem; padding:2px 5px; border-radius:4px;">ACTIVE</span>` : '';
        return `
            <div class="history-item-row" onclick="viewHistoryOrder('${h.originalIndex}', ${h.isActive}, this)" style="background:${bg}; border-left:${borderLeft}; padding:15px; margin-bottom:12px; border-radius:15px; box-shadow:var(--neumorph-out-sm); display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition: 0.2s;">
                <div>
                    <strong style="font-size:1rem; color:var(--text-primary);">${h.table}</strong>
                    <span style="font-size:0.8rem; color:var(--text-secondary);">#${h.id}</span> ${statusLabel}<br>
                    <small style="color:var(--text-secondary);">${h.date}</small>
                </div>
                <div style="text-align:right;">
                    <div class="pay-info-val" style="font-weight:800; color:var(--col-primary); font-size:1rem;">${appSettings.property.currency} ${h.total.toFixed(0)}</div>
                    <small style="color:var(--col-success);">View <i class="fas fa-chevron-right"></i></small>
                </div>
            </div>`;
    };

    actives.forEach(h => div.innerHTML += renderRow(h));
    if (actives.length > 0 && closeds.length > 0) {
        div.innerHTML += '<div style="margin: 15px 0; border-bottom: 1px dashed var(--text-secondary); opacity: 0.2;"></div>';
    }
    // Show closed orders in reverse chronological order (newest first)
    closeds.slice().reverse().forEach(h => div.innerHTML += renderRow(h));
}

// ============================================================================
// DATE RANGE HELPERS (based on last reconciliation)
// ============================================================================
function setDefaultHistoryDates() {
    const startInput = document.getElementById('hist-start');
    const endInput = document.getElementById('hist-end');
    if (!startInput || !endInput) return;

    const now = new Date();
    const pad = (num) => num.toString().padStart(2, '0');

    if (app.lastReconciliation && app.lastReconciliation > 0) {
        const lastRec = new Date(app.lastReconciliation);
        startInput.value = `${lastRec.getFullYear()}-${pad(lastRec.getMonth() + 1)}-${pad(lastRec.getDate())}T${pad(lastRec.getHours())}:${pad(lastRec.getMinutes())}:${pad(lastRec.getSeconds())}`;
    } else {
        const openT = appSettings.property.openingTime || '00:00';
        startInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${openT}`;
    }

    endInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    renderHistory();
}

function resetHistoryDates() {
    document.getElementById('hist-start').value = '';
    document.getElementById('hist-end').value = '';
    renderHistory();
}

// ============================================================================
// BULK DELETE MODAL
// ============================================================================
function openBulkDeleteModal() {
    if (!hasPerm('wipeHistory')) return showCustomAlert("Denied", "Admin authorization required to bulk delete history.");
    document.getElementById('bulk-delete-modal').classList.add('active');
}

function executeBulkDelete() {
    const sDate = document.getElementById('bulk-del-start').value;
    const eDate = document.getElementById('bulk-del-end').value;
    if (!sDate || !eDate) return showToast("Select date and time first");

    const start = new Date(sDate).getTime();
    const end = new Date(eDate).getTime();

    openConfirm("CRITICAL WARNING", `You are about to PERMANENTLY delete all orders between ${new Date(sDate).toLocaleString()} and ${new Date(eDate).toLocaleString()}. This cannot be undone. Are you sure?`, () => {
        const initialCount = app.history.length;
        app.history = app.history.filter(h => {
            const orderTime = new Date(h.startTimeRaw || h.date).getTime();
            return orderTime < start || orderTime > end;
        });

        const deletedCount = initialCount - app.history.length;
        localStorage.setItem('orderHistory', JSON.stringify(app.history));

        closeModal('bulk-delete-modal');
        renderHistory();
        showToast(`Permanently deleted ${deletedCount} orders.`);
    });
}

// ============================================================================
// DELETE SINGLE HISTORY ORDER (called from viewHistoryOrder)
// ============================================================================
function deleteHistoryOrder(index) {
    if (!hasPerm('wipeHistory')) return showCustomAlert("Denied", "Admin authorization required to delete history.");
    openConfirm("Delete Order", "Are you sure you want to permanently delete this order?", () => {
        app.history.splice(index, 1);
        localStorage.setItem('orderHistory', JSON.stringify(app.history));
        showToast("Order deleted from history.");
        renderHistory();
        // Clear detail view
        document.getElementById('hist-detail-body').innerHTML = '<h2 style="color:var(--text-secondary); text-align:center; margin-top:50px;">Select an order to view details</h2>';
    });
}

// ============================================================================
// VIEW ORDER DETAILS
// ============================================================================
function viewHistoryOrder(indexOrTable, isActive, elem) {
    if (elem) {
        document.querySelectorAll('.history-item-row').forEach(e => e.style.boxShadow = 'var(--neumorph-out-sm)');
        elem.style.boxShadow = 'var(--neumorph-in-sm)';
    }

    let data;
    if (isActive) {
        const o = app.orders[indexOrTable];
        const subtotal = o.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const discount = Number(o.discount) || 0;
        const total = subtotal - discount;
        data = {
            ...o,
            table: indexOrTable,
            total: total,
            sub: subtotal,
            discountVal: discount,
            date: new Date(o.startTime).toLocaleString(),
            payments: []
        };
    } else {
        data = app.history[indexOrTable];
    }
    if (!data) return;

    let clientText = "Walk-in / Guest";
    if (data.clientId) {
        const c = app.clients.find(x => x.id === data.clientId);
        if (c) clientText = `${c.name} (${c.phone})`;
    } else if (data.customer && data.customer.name) {
        clientText = `${data.customer.name} - ${data.customer.phone || ''}`;
    }

    let payHtml = (data.payments && data.payments.length > 0) ? data.payments.map(p => `${p.method}: ${p.amount}`).join(', ') : (isActive ? 'Not Paid Yet' : 'Unknown');
    let taxHtml = '0 (Included / None)';

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
            <div>
                <h2 style="color:var(--col-primary); margin:0;">Invoice #${data.id} ${isActive ? '<span style="color:var(--col-danger); font-size:0.8rem;">(ACTIVE)</span>' : ''}</h2>
                <span style="color:var(--text-secondary); font-size:0.85rem;">Table: ${data.table}</span>
            </div>
            <div style="text-align:right;">
                <div class="pay-info-val" style="font-weight:800; color:var(--col-success); font-size:1.5rem;">${appSettings.property.currency} ${data.total.toFixed(0)}</div>
                <span style="color:var(--text-secondary); font-size:0.8rem;">${data.date}</span>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; font-size:0.85rem;">
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Client:</strong> ${clientText}</div>
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Waiter:</strong> ${formatWorkerName(data.waiter || 'Unknown')}</div>
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Order Duration:</strong> ${data.duration || '--'}</div>
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Payments:</strong> ${payHtml}</div>
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Discount Given:</strong> ${appSettings.property.currency} ${(data.discountVal || 0).toFixed(0)}</div>
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Tax Applied:</strong> ${taxHtml}</div>
        </div>

        <h4 style="margin-bottom:10px; color:var(--col-primary);">Order Items</h4>
        <div class="order-items-wrapper" style="box-shadow:none; border:1px solid rgba(255,255,255,0.2); max-height:200px; overflow-y:auto; margin-bottom:15px; background:var(--bg-app); border-radius:12px;">
    `;

    data.items.forEach(i => {
        let itemName = i.name;
        if (i.itemNote) {
            itemName += `<br><small style="color:gray;">Note: ${i.itemNote}</small>`;
        }
        html += `
        <div class="order-item" style="border-bottom:1px solid rgba(0,0,0,0.05); padding:8px 10px;">
            <div class="item-name" style="font-weight:700;">${itemName}</div>
            <div class="item-unit-price">${i.price}</div>
            <div class="item-qty" style="text-align:center;">x${i.qty}</div>
            <div class="item-total">${i.total.toFixed(0)}</div>
        </div>`;
    });

    html += `</div>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
    `;

    if (!isActive) {
        html += `
            <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="deleteHistoryOrder(${indexOrTable})"><i class="fas fa-trash"></i> Delete Order</button>
            <button class="btn-modern btn-modern-save" onclick="rePrintHistory(${indexOrTable}, false)"><i class="fas fa-print"></i> Re-Print Bill</button>
            <button class="btn-modern btn-modern-save" style="background:var(--col-secondary);" onclick="loadToCartReadOnly(${indexOrTable})"><i class="fas fa-eye"></i> View in Cart</button>
        `;
    } else {
        html += `
            <button class="btn-modern btn-modern-save" style="background:var(--col-primary);" onclick="showSection('items'); selectTable('${indexOrTable}', true)"><i class="fas fa-pen"></i> Edit Active Order</button>
        `;
    }

    html += `</div>`;

    document.getElementById('hist-detail-body').innerHTML = html;
}

// ============================================================================
// LOAD HISTORY ORDER INTO READ-ONLY CART
// ============================================================================
function loadToCartReadOnly(index) {
    const data = app.history[index];
    if (!data) return;
    app.isReadOnly = true;
    document.getElementById('current-table-display').textContent = data.table + " (Hist)";
    document.getElementById('order-id-display').textContent = 'Ord #' + data.id;
    document.getElementById('serv-time-display').textContent = data.duration || "--:--";
    app.currentOrder = JSON.parse(JSON.stringify(data.items));
    document.querySelector('.right-panel-container').classList.add('read-only-mode');

    document.body.classList.remove('hide-cart');

    const listHeader = document.querySelector('.order-items-wrapper');
    if (!document.getElementById('ro-banner')) {
        const banner = document.createElement('div');
        banner.id = 'ro-banner';
        banner.className = 'read-only-banner';
        banner.innerText = "VIEWING HISTORY";
        listHeader.prepend(banner);
    }

    const footerActions = document.querySelector('.order-actions');
    footerActions.innerHTML = `<button class="action-btn btn-print" onclick="rePrintHistory(${index}, false)"><i class="fas fa-print"></i> Re-Print</button><button class="action-btn btn-back" onclick="exitReadOnlyMode()">Back to New Order</button>`;

    if (typeof renderOrderList === 'function') renderOrderList();
    document.getElementById('subtotal-display').textContent = data.sub.toFixed(0);
    document.getElementById('total-display').textContent = `${appSettings.property.currency} ${data.total.toFixed(0)}`;
    document.getElementById('slide-out-menu').classList.remove('active');
}

// ============================================================================
// EXIT READ-ONLY MODE
// ============================================================================
function exitReadOnlyMode() {
    app.isReadOnly = false;
    document.querySelector('.right-panel-container').classList.remove('read-only-mode');
    const banner = document.getElementById('ro-banner');
    if (banner) banner.remove();

    const footerActions = document.querySelector('.order-actions');
    footerActions.innerHTML = `<button class="action-btn btn-delete" onclick="clearOrder()"><i class="fas fa-trash"></i></button><button class="action-btn btn-print" onclick="printBill(true)" style="background:var(--col-secondary);"><i class="fas fa-receipt"></i> KOT</button><button class="action-btn btn-print" onclick="printBill(false)"><i class="fas fa-print"></i> Bill</button><button class="action-btn btn-close" id="cart-close-btn" onclick="openPaymentModal()">Close</button>`;

    if (app.table && app.orders[app.table]) {
        if (typeof loadTableData === 'function') loadTableData();
        if (typeof renderOrderList === 'function') renderOrderList();
        if (typeof startTimer === 'function') startTimer();
    } else {
        document.getElementById('current-table-display').textContent = '--';
        app.currentOrder = [];
        if (typeof renderOrderList === 'function') renderOrderList();
        document.getElementById('serv-time-display').textContent = '00s';
        document.getElementById('cart-client-display').style.display = 'none';
        document.body.classList.add('hide-cart');
    }
}

// ============================================================================
// REPRINT HISTORY ORDER (KOT or BILL)
// ============================================================================
function rePrintHistory(index, isKOT = false) {
    if (!hasPerm('reprintOrder')) return showCustomAlert('Denied', 'No permission to reprint closed orders.');
    const data = app.history[index];
    const temp = app.orders[app.table];
    app.table = data.table;
    app.orders[app.table] = {
        id: data.id,
        waiter: data.waiter,
        customer: data.customer,
        startTime: data.startTimeRaw || Date.now()
    };
    app.currentOrder = data.items;
    if (typeof printBill === 'function') printBill(isKOT, data.payments || []);
    if (temp) app.orders[app.table] = temp;
    else delete app.orders[app.table];
}