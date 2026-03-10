/* 
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT: ORDER HISTORY & LIVE DASHBOARD (dashboard-history.js)               ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

// --- ENHANCED HISTORY LOGIC WITH DEEP SEARCH & ACTIVE ORDERS ---
function renderHistory() {
    const term = document.getElementById('hist-search').value.toLowerCase();
    const showAll = document.getElementById('hist-show-all') ? document.getElementById('hist-show-all').checked : false;
    const div = document.getElementById('order-history-list'); 
    div.innerHTML = '';

    let combinedOrders =[];
    let calcActiveTotal = 0;
    let calcClosedTotal = 0;
    
    for(let tName in app.orders) {
        const o = app.orders[tName];
        if(o && o.items && o.items.length > 0) {
            let total = o.items.reduce((sum, item) => sum + item.total, 0) - (o.discount || 0);
            calcActiveTotal += total; // NEW: Calculate active totals
            combinedOrders.push({
                ...o, table: tName, total: total, isActive: true,
                date: new Date(o.startTime).toLocaleString(),
                originalIndex: tName 
            });
        }
    }

    app.history.forEach((h, i) => {
        // NEW: Filter by lastDayEnd timestamp unless 'Show All' is checked
        if (!showAll && app.lastDayEnd > 0) {
            const orderTime = new Date(h.startTimeRaw || h.date).getTime();
            if (orderTime < app.lastDayEnd) return; // Skip old orders for clean view
        }
        calcClosedTotal += h.total; // NEW: Calculate closed totals
        combinedOrders.push({ ...h, isActive: false, originalIndex: i });
    });
    
    // NEW: Update Header Totals
    const activeTotalEl = document.getElementById('hist-active-total');
    const closedTotalEl = document.getElementById('hist-closed-total');
    if (activeTotalEl) activeTotalEl.textContent = `${appSettings.property.currency} ${calcActiveTotal.toFixed(0)}`;
    if (closedTotalEl) closedTotalEl.textContent = `${appSettings.property.currency} ${calcClosedTotal.toFixed(0)}`;

    const filtered = combinedOrders.filter(h => {
        if(!term) return true;
        if(h.id && h.id.toString().toLowerCase().includes(term)) return true;
        if(h.table && h.table.toLowerCase().includes(term)) return true;
        if(h.waiter && h.waiter.toLowerCase().includes(term)) return true;
        if(h.total && h.total.toString().includes(term)) return true;
        if(h.customer && h.customer.name && h.customer.name.toLowerCase().includes(term)) return true;
        if(h.items && h.items.some(item => item.name.toLowerCase().includes(term))) return true;
        return false;
    });

    if(filtered.length === 0) {
        div.innerHTML = "<p style='text-align:center;color:var(--text-secondary); margin-top:20px;'>No matching order found</p>";
        return;
    }

    const actives = filtered.filter(f => f.isActive);
    const closeds = filtered.filter(f => !f.isActive).slice().reverse();

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
                    <div style="font-weight:800; color:var(--col-primary); font-size:1rem;">${appSettings.property.currency} ${h.total.toFixed(0)}</div>
                    <small style="color:var(--col-success);">View <i class="fas fa-chevron-right"></i></small>
                </div>
            </div>`;
    };

    actives.forEach(h => div.innerHTML += renderRow(h));
    if(actives.length > 0 && closeds.length > 0) {
        div.innerHTML += '<div style="margin: 15px 0; border-bottom: 1px dashed var(--text-secondary); opacity: 0.2;"></div>';
    }
    closeds.forEach(h => div.innerHTML += renderRow(h));
}

// NEW: Bulk Delete Features
function openBulkDeleteModal() {
    if(!hasPerm('wipeHistory')) return showCustomAlert("Denied", "Admin authorization required to bulk delete history.");
    document.getElementById('bulk-delete-modal').classList.add('active');
}

function executeBulkDelete() {
    const sDate = document.getElementById('bulk-del-start').value;
    const eDate = document.getElementById('bulk-del-end').value;
    if(!sDate || !eDate) return showToast("Select date and time first");
    
    // Parse directly from datetime-local input
    const start = new Date(sDate).getTime();
    const end = new Date(eDate).getTime();

    openConfirm("CRITICAL WARNING", `You are about to PERMANENTLY delete all orders between ${new Date(sDate).toLocaleString()} and ${new Date(eDate).toLocaleString()}. This cannot be undone. Are you sure?`, () => {
        const initialCount = app.history.length;
        app.history = app.history.filter(h => {
            const orderTime = new Date(h.startTimeRaw || h.date).getTime();
            // Keep it if it's OUTSIDE the deletion window
            return orderTime < start || orderTime > end;
        });
        
        const deletedCount = initialCount - app.history.length;
        localStorage.setItem('orderHistory', JSON.stringify(app.history));
        
        closeModal('bulk-delete-modal');
        renderHistory();
        showToast(`Permanently deleted ${deletedCount} orders.`);
    });
}

function viewHistoryOrder(indexOrTable, isActive, elem) {
    if(elem) {
        document.querySelectorAll('.history-item-row').forEach(e => e.style.boxShadow = 'var(--neumorph-out-sm)');
        elem.style.boxShadow = 'var(--neumorph-in-sm)';
    }

    let data;
    if (isActive) {
        const o = app.orders[indexOrTable];
        data = {
            ...o, table: indexOrTable, total: o.items.reduce((sum, item) => sum + item.total, 0) - (o.discount || 0),
            sub: o.items.reduce((sum, item) => sum + item.total, 0), discountVal: o.discount || 0,
            date: new Date(o.startTime).toLocaleString(), payments:[]
        };
    } else {
        data = app.history[indexOrTable];
    }
    if(!data) return;
    
    let clientText = "Walk-in / Guest";
    if(data.clientId) {
        const c = app.clients.find(x => x.id === data.clientId);
        if(c) clientText = `${c.name} (${c.phone})`;
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
                <div style="font-size:1.5rem; font-weight:800; color:var(--col-success);">${appSettings.property.currency} ${data.total.toFixed(0)}</div>
                <span style="color:var(--text-secondary); font-size:0.8rem;">${data.date}</span>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; font-size:0.85rem;">
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Client:</strong> ${clientText}</div>
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Waiter:</strong> ${data.waiter || 'Unknown'}</div>
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Order Duration:</strong> ${data.duration || '--'}</div>
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Payments:</strong> ${payHtml}</div>
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Discount Given:</strong> ${appSettings.property.currency} ${(data.discountVal||0).toFixed(0)}</div>
            <div style="background:var(--bg-app); padding:10px; border-radius:10px; box-shadow:var(--neumorph-in-sm);"><strong>Tax Applied:</strong> ${taxHtml}</div>
        </div>

        <h4 style="margin-bottom:10px; color:var(--col-primary);">Order Items</h4>
        <div class="order-items-wrapper" style="box-shadow:none; border:1px solid rgba(255,255,255,0.2); max-height:200px; overflow-y:auto; margin-bottom:15px; background:var(--bg-app); border-radius:12px;">
    `;

    data.items.forEach(i => {
        html += `
        <div class="order-item" style="border-bottom:1px solid rgba(0,0,0,0.05); padding:8px 10px;">
            <div class="item-name" style="font-weight:700;">${i.name}</div>
            <div class="item-unit-price">${i.price}</div>
            <div class="item-qty" style="text-align:center;">x${i.qty}</div>
            <div class="item-total">${i.total.toFixed(0)}</div>
        </div>`;
    });

    html += `</div>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
    `;

    if(!isActive) {
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

function loadToCartReadOnly(index) {
    const data = app.history[index]; if(!data) return;
    app.isReadOnly = true;
    document.getElementById('current-table-display').textContent = data.table + " (Hist)";
    document.getElementById('order-id-display').textContent = 'Ord #' + data.id;
    document.getElementById('serv-time-display').textContent = data.duration || "--:--";
    app.currentOrder = JSON.parse(JSON.stringify(data.items));
    document.querySelector('.right-panel-container').classList.add('read-only-mode');
    
    document.body.classList.remove('hide-cart'); 
    
    const listHeader = document.querySelector('.order-items-wrapper');
    if(!document.getElementById('ro-banner')) { const banner = document.createElement('div'); banner.id = 'ro-banner'; banner.className = 'read-only-banner'; banner.innerText = "VIEWING HISTORY"; listHeader.prepend(banner); }
    
    const footerActions = document.querySelector('.order-actions');
    footerActions.innerHTML = `<button class="action-btn btn-print" onclick="rePrintHistory(${index}, false)"><i class="fas fa-print"></i> Re-Print</button><button class="action-btn btn-back" onclick="exitReadOnlyMode()">Back to New Order</button>`;
    
    if(typeof renderOrderList === 'function') renderOrderList();
    document.getElementById('subtotal-display').textContent = data.sub.toFixed(0);
    document.getElementById('total-display').textContent = `PKR ${data.total.toFixed(0)}`;
    document.getElementById('slide-out-menu').classList.remove('active');
}

function exitReadOnlyMode() {
    app.isReadOnly = false; document.querySelector('.right-panel-container').classList.remove('read-only-mode');
    const banner = document.getElementById('ro-banner'); if(banner) banner.remove();
    
    const footerActions = document.querySelector('.order-actions');
    footerActions.innerHTML = `<button class="action-btn btn-delete" onclick="clearOrder()"><i class="fas fa-trash"></i></button><button class="action-btn btn-print" onclick="printBill(true)" style="background:var(--col-secondary);"><i class="fas fa-receipt"></i> KOT</button><button class="action-btn btn-print" onclick="printBill(false)"><i class="fas fa-print"></i> Bill</button><button class="action-btn btn-close" id="cart-close-btn" onclick="openPaymentModal()">Close</button>`;
    
    if (app.table && app.orders[app.table]) { 
        if(typeof loadTableData === 'function') loadTableData(); 
        if(typeof renderOrderList === 'function') renderOrderList(); 
        if(typeof startTimer === 'function') startTimer(); 
    } else { 
        document.getElementById('current-table-display').textContent = '--'; 
        app.currentOrder =[]; 
        if(typeof renderOrderList === 'function') renderOrderList(); 
        document.getElementById('serv-time-display').textContent = '00s'; 
        document.getElementById('cart-client-display').style.display='none'; 
        document.body.classList.add('hide-cart');
    }
}

function rePrintHistory(index, isKOT = false) {
    if(!hasPerm('reprintOrder')) return showCustomAlert('Denied', 'No permission to reprint closed orders.');
    const data = app.history[index]; const temp = app.orders[app.table];
    app.table = data.table; app.orders[app.table] = { id: data.id, waiter: data.waiter, customer: data.customer, startTime: data.startTimeRaw || Date.now() }; app.currentOrder = data.items;
    if(typeof printBill === 'function') printBill(isKOT, data.payments ||[]);
    if(temp) app.orders[app.table] = temp; else delete app.orders[app.table]; 
}

// --- DASHBOARD LOGIC (CHART.JS INCLUDED) ---
function renderDashboard() {
    let sDateInput = document.getElementById('dash-start-date').value;
    let sTimeInput = document.getElementById('dash-start-time').value;
    let eDateInput = document.getElementById('dash-end-date').value;
    let eTimeInput = document.getElementById('dash-end-time').value;

    if(!sDateInput || !eDateInput) {
        let now = new Date();
        let pad = (num) => num.toString().padStart(2, '0');
        let localDateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
        
        let openT = appSettings.property.openingTime || '00:00';
        let closeT = appSettings.property.closingTime || '23:59';
        
        document.getElementById('dash-start-date').value = localDateStr;
        document.getElementById('dash-start-time').value = openT;
        
        let endD = new Date(`${localDateStr}T${closeT}`);
        if(openT > closeT) endD.setDate(endD.getDate() + 1);
        
        document.getElementById('dash-end-date').value = `${endD.getFullYear()}-${pad(endD.getMonth()+1)}-${pad(endD.getDate())}`;
        document.getElementById('dash-end-time').value = closeT;
        
        sDateInput = document.getElementById('dash-start-date').value;
        sTimeInput = document.getElementById('dash-start-time').value;
        eDateInput = document.getElementById('dash-end-date').value;
        eTimeInput = document.getElementById('dash-end-time').value;
    }

    let sDate = new Date(`${sDateInput}T${sTimeInput}`);
    let eDate = new Date(`${eDateInput}T${eTimeInput}`);

    const filteredHistory = app.history.filter(h => {
        const d = new Date(h.date);
        return d >= sDate && d <= eDate;
    });

    let totalClosed = 0, closedCount = 0, totalDisc = 0, totalUdhaar = 0;
    let paymentsMap = {};
    let chartLabels =[];
    let chartData =[];
    
    // Preparing Chart Data (Sales By Date inside range)
    let chartDataMap = {};

    filteredHistory.forEach(h => {
        totalClosed += h.total;
        closedCount++;
        totalDisc += (h.discountVal || 0);
        
        // Chart Map Prep
        let dStr = new Date(h.date).toLocaleDateString();
        chartDataMap[dStr] = (chartDataMap[dStr] || 0) + h.total;

        if(h.payments) {
            h.payments.forEach(p => {
                paymentsMap[p.method] = (paymentsMap[p.method] || 0) + p.amount;
                if(p.method === 'Udhaar') totalUdhaar += p.amount; // explicit tracking for Udhaar
            });
        }
    });

    for(let d in chartDataMap) {
        chartLabels.push(d);
        chartData.push(chartDataMap[d]);
    }

    let totalActive = 0, activeCount = 0;
    for(let key in app.orders) {
        const ord = app.orders[key];
        if(ord && ord.items && ord.items.length > 0) {
            activeCount++;
            let sub = ord.items.reduce((a,b)=>a+(b.total||0),0);
            let d = parseFloat(ord.discount) || 0;
            if(ord.discType === 'percent') d = sub * (d/100);
            totalActive += (sub - d);
        }
    }

    let html = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:25px;">
            <div class="pay-info-box" style="background:rgba(56, 161, 105, 0.1);"><div class="pay-info-label">Closed Sales</div><div class="pay-info-val" style="color:var(--col-success);">${appSettings.property.currency} ${totalClosed.toFixed(0)}</div></div>
            <div class="pay-info-box" style="background:var(--col-primary-light);"><div class="pay-info-label">Active Orders Sales</div><div class="pay-info-val" style="color:var(--col-primary);">${appSettings.property.currency} ${totalActive.toFixed(0)}</div></div>
            <div class="pay-info-box" style="background:rgba(230, 81, 0, 0.1);"><div class="pay-info-label">Udhaar (Credit) Given</div><div class="pay-info-val" style="color:#e65100;">${appSettings.property.currency} ${totalUdhaar.toFixed(0)}</div></div>
            <div class="pay-info-box"><div class="pay-info-label">Closed Orders</div><div class="pay-info-val">${closedCount}</div></div>
            <div class="pay-info-box"><div class="pay-info-label">Active Orders</div><div class="pay-info-val">${activeCount}</div></div>
            <div class="pay-info-box" style="background:rgba(229, 62, 62, 0.1);"><div class="pay-info-label">Total Discounts Given</div><div class="pay-info-val" style="color:var(--col-danger);">${appSettings.property.currency} ${totalDisc.toFixed(0)}</div></div>
        </div>

        <!-- GRAPH/CHART -->
        <div style="background:var(--bg-app); border-radius:15px; padding:15px; margin-bottom:25px; box-shadow:var(--neumorph-out-sm);">
            <h3 style="margin-bottom:15px; color:var(--text-secondary); text-transform:uppercase; font-size:0.9rem; letter-spacing:1px;">Revenue Trend</h3>
            <canvas id="dashSalesChart" style="width:100%; max-height:300px;"></canvas>
        </div>
        
        <h3 style="margin-bottom:15px; color:var(--text-secondary); text-transform:uppercase; font-size:0.9rem; letter-spacing:1px;">Payments Received Breakdown</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:15px;">
    `;
    
    let hasPayments = false;
    for(let method in paymentsMap) {
        hasPayments = true;
        html += `
        <div style="background:var(--bg-app); border-radius:12px; padding:15px; display:flex; flex-direction:column; align-items:center; box-shadow:var(--neumorph-in-sm);">
            <strong style="color:var(--text-primary); margin-bottom:5px;">${method}</strong>
            <span style="color:${method === 'Udhaar' ? 'var(--col-danger)' : 'var(--col-success)'}; font-size:1.3rem; font-weight:800;">${appSettings.property.currency} ${paymentsMap[method].toFixed(0)}</span>
        </div>`;
    }

    if(!hasPayments) html += `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-secondary); font-style:italic;">No payments received yet in this range.</div>`;

    html += `</div>`;
    document.getElementById('dash-content-body').innerHTML = html;

    // Render Chart.js
    setTimeout(() => {
        const ctx = document.getElementById('dashSalesChart');
        if(!ctx) return;
        if(window.dashChart instanceof Chart) window.dashChart.destroy();
        
        // Read CSS Variables for Chart Colors
        const computed = getComputedStyle(document.body);
        const colPrim = computed.getPropertyValue('--col-primary').trim();
        const colPrimLight = computed.getPropertyValue('--col-primary-light').trim();
        const textColor = computed.getPropertyValue('--text-secondary').trim();

        window.dashChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: chartLabels.length > 0 ? chartLabels : ['No Data'],
                datasets:[{
                    label: `Revenue (${appSettings.property.currency})`,
                    data: chartData.length > 0 ? chartData : [0],
                    borderColor: colPrim,
                    backgroundColor: colPrimLight,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, ticks: { color: textColor } },
                    x: { ticks: { color: textColor } }
                }
            }
        });
    }, 100);
}
