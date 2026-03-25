/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: dashboard_charts.js – Live Dashboard with Chart.js                   ║
║         (Auto‑refresh, defaults to period since last day‑end)               ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

let dashboardRefreshInterval = null;

function renderDashboard() {
    // Get date/time inputs
    let sDateInput = document.getElementById('dash-start-date').value;
    let sTimeInput = document.getElementById('dash-start-time').value;
    let eDateInput = document.getElementById('dash-end-date').value;
    let eTimeInput = document.getElementById('dash-end-time').value;

    // If inputs are empty, set defaults based on last reconciliation
    if (!sDateInput || !eDateInput) {
        setDefaultDashboardDates();
        // Re-read after setting
        sDateInput = document.getElementById('dash-start-date').value;
        sTimeInput = document.getElementById('dash-start-time').value;
        eDateInput = document.getElementById('dash-end-date').value;
        eTimeInput = document.getElementById('dash-end-time').value;
    }

    let sDate = new Date(`${sDateInput}T${sTimeInput}`);
    let eDate = new Date(`${eDateInput}T${eTimeInput}`);

    // Filter history by date range
    const filteredHistory = app.history.filter(h => {
        const d = new Date(h.date);
        return d >= sDate && d <= eDate;
    });

    let totalClosed = 0, closedCount = 0, totalDisc = 0, totalUdhaar = 0;
    let paymentsMap = {};
    let chartLabels = [];
    let chartData = [];
    let chartDataMap = {};

    filteredHistory.forEach(h => {
        totalClosed += h.total;
        closedCount++;
        totalDisc += (h.discountVal || 0);

        let dStr = new Date(h.date).toLocaleDateString();
        chartDataMap[dStr] = (chartDataMap[dStr] || 0) + h.total;

        if (h.payments) {
            h.payments.forEach(p => {
                paymentsMap[p.method] = (paymentsMap[p.method] || 0) + p.amount;
                if (p.method === 'Udhaar') totalUdhaar += p.amount;
            });
        }
    });

    for (let d in chartDataMap) {
        chartLabels.push(d);
        chartData.push(chartDataMap[d]);
    }

    // Active orders totals
    let totalActive = 0, activeCount = 0;
    for (let key in app.orders) {
        const ord = app.orders[key];
        if (ord && ord.items && ord.items.length > 0) {
            activeCount++;
            let sub = ord.items.reduce((a, b) => a + (b.total || 0), 0);
            let d = parseFloat(ord.discount) || 0;
            if (ord.discType === 'percent') d = sub * (d / 100);
            totalActive += (sub - d);
        }
    }

    const uiFont = appSettings.preferences.uiFont;

    let html = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:25px;">
            <div class="pay-info-box" style="background:rgba(56, 161, 105, 0.1);"><div class="pay-info-label">Closed Sales</div><div class="pay-info-val" style="color:var(--col-success); font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${appSettings.property.currency} ${totalClosed.toFixed(0)}</div></div>
            <div class="pay-info-box" style="background:var(--col-primary-light);"><div class="pay-info-label">Active Orders Sales</div><div class="pay-info-val" style="color:var(--col-primary); font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${appSettings.property.currency} ${totalActive.toFixed(0)}</div></div>
            <div class="pay-info-box" style="background:rgba(230, 81, 0, 0.1);"><div class="pay-info-label">Udhaar (Credit) Given</div><div class="pay-info-val" style="color:#e65100; font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${appSettings.property.currency} ${totalUdhaar.toFixed(0)}</div></div>
            <div class="pay-info-box"><div class="pay-info-label">Closed Orders</div><div class="pay-info-val" style="font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${closedCount}</div></div>
            <div class="pay-info-box"><div class="pay-info-label">Active Orders</div><div class="pay-info-val" style="font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${activeCount}</div></div>
            <div class="pay-info-box" style="background:rgba(229, 62, 62, 0.1);"><div class="pay-info-label">Total Discounts Given</div><div class="pay-info-val" style="color:var(--col-danger); font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${appSettings.property.currency} ${totalDisc.toFixed(0)}</div></div>
        </div>

        <div style="background:var(--bg-app); border-radius:15px; padding:15px; margin-bottom:25px; box-shadow:var(--neumorph-out-sm);">
            <h3 style="margin-bottom:15px; color:var(--text-secondary); text-transform:uppercase; font-size:0.9rem; letter-spacing:1px;">Revenue Trend</h3>
            <canvas id="dashSalesChart" style="width:100%; max-height:300px;"></canvas>
        </div>

        <h3 style="margin-bottom:15px; color:var(--text-secondary); text-transform:uppercase; font-size:0.9rem; letter-spacing:1px;">Payments Received Breakdown</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:15px;">
    `;

    let hasPayments = false;
    for (let method in paymentsMap) {
        hasPayments = true;
        html += `
        <div style="background:var(--bg-app); border-radius:12px; padding:15px; display:flex; flex-direction:column; align-items:center; box-shadow:var(--neumorph-in-sm);">
            <strong style="color:var(--text-primary); margin-bottom:5px;">${method}</strong>
            <span class="pay-info-val" style="color:${method === 'Udhaar' ? 'var(--col-danger)' : 'var(--col-success)'}; font-size:1.3rem; font-weight:800; font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${appSettings.property.currency} ${paymentsMap[method].toFixed(0)}</span>
        </div>`;
    }

    if (!hasPayments) html += `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-secondary); font-style:italic;">No payments received yet in this range.</div>`;

    html += `</div>`;
    document.getElementById('dash-content-body').innerHTML = html;

    // Render chart after DOM update
    setTimeout(() => {
        const ctx = document.getElementById('dashSalesChart');
        if (!ctx) return;
        if (window.dashChart instanceof Chart) window.dashChart.destroy();

        const computed = getComputedStyle(document.body);
        const colPrim = computed.getPropertyValue('--col-primary').trim();
        const colPrimLight = computed.getPropertyValue('--col-primary-light').trim();
        const textColor = computed.getPropertyValue('--text-secondary').trim();

        window.dashChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: chartLabels.length > 0 ? chartLabels : ['No Data'],
                datasets: [{
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

// ============================================================================
// Set default dashboard dates (since last reconciliation, including seconds)
// ============================================================================
function setDefaultDashboardDates() {
    const startInput = document.getElementById('dash-start-date');
    const startTime = document.getElementById('dash-start-time');
    const endInput = document.getElementById('dash-end-date');
    const endTime = document.getElementById('dash-end-time');

    if (!startInput || !startTime || !endInput || !endTime) return;

    const now = new Date();
    const pad = (num) => num.toString().padStart(2, '0');

    // If there's a last reconciliation timestamp, use it as start (including seconds)
    if (app.lastReconciliation && app.lastReconciliation > 0) {
        const lastRec = new Date(app.lastReconciliation);
        startInput.value = `${lastRec.getFullYear()}-${pad(lastRec.getMonth() + 1)}-${pad(lastRec.getDate())}`;
        startTime.value = `${pad(lastRec.getHours())}:${pad(lastRec.getMinutes())}:${pad(lastRec.getSeconds())}`;
    } else {
        // Otherwise default to today's opening time
        const openT = appSettings.property.openingTime || '00:00';
        startInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        startTime.value = openT;
    }

    // End date/time defaults to now (including seconds)
    endInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    endTime.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// ============================================================================
// Reset dashboard to last reconciliation range (call after day end)
// ============================================================================
function resetDashboardToLastReconciliation() {
    setDefaultDashboardDates();
    renderDashboard();
}

// ============================================================================
// Start auto-refresh (call when dashboard is shown)
// ============================================================================
function startDashboardAutoRefresh() {
    if (dashboardRefreshInterval) clearInterval(dashboardRefreshInterval);
    dashboardRefreshInterval = setInterval(() => {
        // Only refresh if dashboard is active
        if (document.getElementById('dashboard-section').classList.contains('active')) {
            renderDashboard();
        }
    }, 30000); // every 30 seconds
}

// ============================================================================
// Stop auto-refresh (call when dashboard is hidden)
// ============================================================================
function stopDashboardAutoRefresh() {
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = null;
    }
}