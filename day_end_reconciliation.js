/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: day_end_reconciliation.js – Day End, Reconciliation, Z-Reading       ║
║         (After day end, resets dashboard/history default dates)             ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function calculateExpectedCash() {
    const shiftStart = app.currentShiftStart;
    const ordersInShift = app.history.filter(h => {
        const orderTime = new Date(h.startTimeRaw || h.date).getTime();
        return orderTime >= shiftStart;
    });
    
    let expectedCash = 0;
    ordersInShift.forEach(order => {
        if (order.payments) {
            order.payments.forEach(p => {
                if (p.method.toLowerCase() === 'cash') {
                    expectedCash += p.amount;
                }
            });
        }
    });
    return expectedCash;
}

function openReconcileModal() {
    if (!hasPerm('manageAccounts')) return showCustomAlert("Denied", "You do not have permission to reconcile accounts.");
    
    document.getElementById('reconcile-modal').classList.add('active');
    document.getElementById('reconcile-modal-cash-input').value = '';
    document.getElementById('reconcile-modal-diff').textContent = '';
    document.getElementById('reconcile-modal-diff').style.color = 'var(--text-secondary)';
    
    const expectedCash = calculateExpectedCash();
    document.getElementById('reconcile-modal-expected').textContent = `${appSettings.property.currency} ${expectedCash.toFixed(0)}`;
    
    const onInputChange = () => {
        const actualCash = parseFloat(document.getElementById('reconcile-modal-cash-input').value) || 0;
        const difference = actualCash - expectedCash;
        const diffElement = document.getElementById('reconcile-modal-diff');
        diffElement.textContent = `${appSettings.property.currency} ${difference.toFixed(0)} (${difference > 0 ? 'Over' : (difference < 0 ? 'Short' : 'Matched')})`;
        diffElement.style.color = difference === 0 ? 'var(--col-success)' : 'var(--col-danger)';
    };
    
    document.getElementById('reconcile-modal-cash-input').oninput = onInputChange;
    onInputChange();
    setupEnterKeyOnModal('reconcile-modal', '.save');
}

function performDayEnd() {
    openConfirm("Perform Day End", "Are you sure? This will finalize the day, save a backup, and reset shift totals. All reconciled data will be logged.", () => {
        closeModal('day-end-modal');
        backupSystem(true);
        
        const expectedCash = calculateExpectedCash();
        const actualCashInput = document.getElementById('reconcile-modal-cash-input');
        const actualCash = parseFloat(actualCashInput ? actualCashInput.value : '0') || 0;
        const difference = actualCash - expectedCash;
        
        app.reconciliationHistory.push({
            date: new Date().toLocaleString(),
            shiftStart: new Date(app.currentShiftStart).toLocaleString(),
            expectedCash: expectedCash,
            actualCash: actualCash,
            difference: difference,
            performedBy: app.currentUser ? app.currentUser.name : 'System'
        });
        localStorage.setItem('pos_reconciliationHistory', JSON.stringify(app.reconciliationHistory));
        
        app.lastReconciliation = Date.now();
        localStorage.setItem('pos_lastReconciliation', app.lastReconciliation.toString());
        
        app.currentShiftStart = Date.now();
        localStorage.setItem('pos_shiftStart', app.currentShiftStart.toString());
        
        // Reset dashboard and history default dates to the new reconciliation time
        if (typeof setDefaultDashboardDates === 'function') setDefaultDashboardDates();
        if (typeof setDefaultHistoryDates === 'function') setDefaultHistoryDates();
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderHistory === 'function') renderHistory();
        
        showToast("Day End Completed! System backed up & refreshed.");
        closeModal('reconcile-modal');
    });
}

function openDayEndModal() {
    document.getElementById('day-end-modal').classList.add('active');
    document.getElementById('slide-out-menu').classList.remove('active');
}

function openZReadingModal() {
    if (!hasPerm('viewReports')) return showCustomAlert("Denied", "You do not have permission to view reports.");
    
    document.getElementById('z-reading-modal').classList.add('active');
    document.getElementById('slide-out-menu').classList.remove('active');
    
    const body = document.getElementById('z-reading-body');
    const shiftStart = app.currentShiftStart;
    
    const shiftOrders = app.history.filter(h => {
        const orderTime = new Date(h.startTimeRaw || h.date).getTime();
        return orderTime >= shiftStart;
    });
    
    let cashierTotals = {};
    
    shiftOrders.forEach(ord => {
        const cName = ord.cashier || 'Unknown';
        if (!cashierTotals[cName]) cashierTotals[cName] = { total: 0, methods: {} };
        
        ord.payments.forEach(p => {
            cashierTotals[cName].methods[p.method] = (cashierTotals[cName].methods[p.method] || 0) + p.amount;
            cashierTotals[cName].total += p.amount;
        });
    });
    
    let html = `
        <div style="background:var(--bg-app); padding:10px; border-radius:10px; margin-bottom:15px; font-size:0.8rem; text-align:center;">
            Shift Started: <b>${new Date(shiftStart).toLocaleString()}</b><br>
            Total Orders Processed: <b>${shiftOrders.length}</b>
        </div>
    `;
    
    if (Object.keys(cashierTotals).length === 0) {
        html += `<p style="text-align:center; color:var(--text-secondary); margin: 30px 0;">No sales recorded in the current shift.</p>`;
    } else {
        for (let cashier in cashierTotals) {
            html += `
                <div style="background:var(--bg-app); border-radius:12px; padding:15px; box-shadow:var(--neumorph-out-sm); margin-bottom:15px;">
                    <h4 style="color:var(--col-primary); margin-bottom:10px; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:5px;">
                        <i class="fas fa-user-circle"></i> Cashier: ${cashier}
                    </h4>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.9rem;">
            `;
            
            for (let method in cashierTotals[cashier].methods) {
                html += `
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:var(--text-secondary);">${method}:</span>
                        <span style="font-weight:700;">${cashierTotals[cashier].methods[method].toFixed(0)}</span>
                    </div>
                `;
            }
            
            html += `
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px dashed rgba(0,0,0,0.1); font-size:1.1rem; font-weight:800; color:var(--text-primary);">
                        <span>TOTAL COLLECTED:</span>
                        <span style="color:var(--col-success);">${appSettings.property.currency} ${cashierTotals[cashier].total.toFixed(0)}</span>
                    </div>
                </div>
            `;
        }
    }
    body.innerHTML = html;
}

function printZReading() {
    const content = document.getElementById('z-reading-body').innerHTML;
    const win = window.open('', '', 'width=400,height=600');
    win.document.write(`
        <html><head><title>Z-Reading</title>
        <style>body{font-family:sans-serif; color:#000; padding:20px; font-size:12px;}</style>
        </head><body>
        <h2 style="text-align:center;">Shift Z-Reading</h2>
        ${content}
        <div style="text-align:center; margin-top:20px;">Printed: ${new Date().toLocaleString()}</div>
        <script>setTimeout(() => window.print(), 500);</script>
        </body></html>
    `);
    win.document.close();
}