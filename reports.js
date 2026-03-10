/* 
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT: REPORTS SUITE & EXPORTING (reports.js)                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

const reportCategories =[
    {
        group: 'Sales Reports',
        reports:[
            'Sale by Day', 'Sale by Week', 'Sale by Month', 'Sale by Quarters', 'Sale by Quarter Years', 
            'Sale by Year Month', 'Sale by Hour', 'Sale by Day of Week', 'Sale by Table', 'Sale by Categories', 
            'Sale by Menu Items', 'Sale by Waitress', 'Sale by Hole Test', 'Sale by Client', 'Sale by Payment Method', 
            'Sale by Order Type', 'e-Report (Date Between)'
        ]
    },
    {
        group: 'Taxes',
        reports:['Collective Sale Tax', 'Taxes by Day', 'Cash Report', 'Taxes on Purchase']
    },
    {
        group: 'Inventory',
        reports:['On Hand by Item', 'Retail On Hand', 'With Sale', 'By Inventory Category', 'By Menu Category', 'Items Sold']
    },
    {
        group: 'Profit Margin',
        reports:['By Item', 'Detail', 'By Menu Categories', 'By Modifier', 'By Modify Fire Categories']
    },
    {
        group: 'Purchasing',
        reports:['Received Voucher by Vendor', 'Receive WhatsApp by Vendor', 'Purchase Order by Vendor']
    },
    {
        group: 'Accounting',
        reports:['Balance Sheet', 'Profit and Loss', 'Exout Status by Server', 'Tips by Waiter', 'Journal', 'Journal with Client and Commission', 'Worker Activity Log']
    },
    {
        group: 'Discounts',
        reports:['Item Price List', 'Card and In Discount', 'Total Discount', 'Percentage Discount Extra']
    }
];

let activeReportName = 'Sale by Day';
window.repChartInstance = null; // Global reference for destroying old charts

function renderReportMenu() {
    const menuBody = document.getElementById('rep-menu-body');
    menuBody.innerHTML = '';
    
    const noDateReports =['On Hand by Item', 'Retail On Hand', 'With Sale', 'By Inventory Category', 'By Menu Category', 'Item Price List', 'Total Discount'];
    const dateFilters = document.getElementById('rep-date-filters');
    if(dateFilters) {
        if (noDateReports.includes(activeReportName)) {
            dateFilters.style.display = 'none';
        } else {
            dateFilters.style.display = 'flex';
        }
    }

    reportCategories.forEach(cat => {
        const grpLabel = document.createElement('div');
        grpLabel.style.cssText = "font-size:0.7rem; font-weight:800; color:var(--col-primary); margin:15px 0 8px; text-transform:uppercase; letter-spacing:1px;";
        grpLabel.textContent = cat.group;
        menuBody.appendChild(grpLabel);
        
        cat.reports.forEach(rep => {
            const btn = document.createElement('button');
            btn.className = `list-item-btn ${activeReportName === rep ? 'active' : ''}`;
            btn.style.padding = "8px 12px";
            btn.style.fontSize = "0.75rem";
            btn.textContent = rep;
            btn.onclick = () => {
                activeReportName = rep;
                renderReportMenu();
                runReport();
            };
            menuBody.appendChild(btn);
        });
    });
}

function runReport() {
    document.getElementById('rep-title').textContent = activeReportName;
    const contentBody = document.getElementById('rep-content-body');
    contentBody.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-secondary);"><i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px;"></i><br>Processing Data...</div>';
    
    setTimeout(() => {
        const sDateInput = document.getElementById('rep-start').value;
        const eDateInput = document.getElementById('rep-end').value;
        
        let sDate, eDate;
        
        // If inputs are empty, default to today's date with configured times
        if(!sDateInput || !eDateInput) {
            let now = new Date();
            let pad = (num) => num.toString().padStart(2, '0');
            let localDateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
            
            let openT = appSettings.property.openingTime || '00:00';
            let closeT = appSettings.property.closingTime || '23:59';
            
            document.getElementById('rep-start').value = `${localDateStr}T${openT}`;
            
            let endD = new Date(`${localDateStr}T${closeT}`);
            if(openT > closeT) endD.setDate(endD.getDate() + 1);
            document.getElementById('rep-end').value = `${endD.getFullYear()}-${pad(endD.getMonth()+1)}-${pad(endD.getDate())}T${closeT}`;
        }

        sDate = new Date(document.getElementById('rep-start').value);
        eDate = new Date(document.getElementById('rep-end').value);
        
        const noDateReports =['On Hand by Item', 'Retail On Hand', 'With Sale', 'By Inventory Category', 'By Menu Category', 'Item Price List', 'Total Discount'];
        const requiresDate = !noDateReports.includes(activeReportName);

        const validHistory = app.history.filter(h => {
            if(!requiresDate) return true; 
            const d = new Date(h.date);
            return d >= sDate && d <= eDate;
        });

        let tableHtml = '';
        let chartType = 'bar';
        let chartLabels =[];
        let chartData =[];

        // ==================================================================
        // 1. ADVANCED: "SALE BY MENU ITEMS" (Modern Dynamic Table)
        // ==================================================================
        if (activeReportName === 'Sale by Menu Items') {
            let map = {};
            let grandSub = 0, grandTotal = 0, grandQty = 0;

            validHistory.forEach(h => {
                // We must proportion the bill's discount across items for exact 'Total'
                let orderSub = h.sub || 1; 
                let orderDisc = h.discountVal || 0;
                let discRatio = orderDisc / orderSub;

                h.items.forEach(i => {
                    if(!map[i.name]) map[i.name] = { name: i.name, qty: 0, price: i.price, subTotal: 0, total: 0 };
                    map[i.name].qty += i.qty;
                    map[i.name].subTotal += i.total;
                    
                    let itemActualTotal = i.total - (i.total * discRatio);
                    map[i.name].total += itemActualTotal;

                    grandQty += i.qty;
                    grandSub += i.total;
                    grandTotal += itemActualTotal;
                });
            });

            // Build Array from Map
            let itemsArray = Object.values(map);
            
            // Sort by Qty Sold descending
            itemsArray.sort((a,b) => b.qty - a.qty);

            // Build Modern Table Output
            tableHtml = `
                <input type="text" class="adv-table-search" id="rep-table-search" placeholder="Search item in report..." oninput="filterReportTable()">
                <div style="overflow-x:auto;">
                    <table class="data-table" id="export-table">
                        <thead>
                            <tr>
                                <th style="width:50px;">S.No</th>
                                <th>Menu Item Name</th>
                                <th style="text-align:center;">Qty Sold</th>
                                <th style="text-align:right;">Price/Unit</th>
                                <th style="text-align:right;">Sub Total</th>
                                <th style="text-align:right; color:var(--col-primary);">Total</th>
                                <th style="text-align:right;">% Share</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            itemsArray.forEach((item, index) => {
                let percent = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(2) : 0;
                tableHtml += `
                    <tr class="rep-data-row">
                        <td>${index + 1}</td>
                        <td style="font-weight:700;">${item.name}</td>
                        <td style="text-align:center;">${item.qty}</td>
                        <td style="text-align:right;">${item.price}</td>
                        <td style="text-align:right;">${item.subTotal.toFixed(0)}</td>
                        <td style="text-align:right; font-weight:700; color:var(--col-primary);">${item.total.toFixed(0)}</td>
                        <td style="text-align:right;">
                            <div style="display:flex; justify-content:flex-end; align-items:center; gap:5px;">
                                <span>${percent}%</span>
                                <div style="width:40px; height:6px; background:var(--bg-app); border-radius:3px; overflow:hidden;">
                                    <div style="width:${percent}%; height:100%; background:var(--col-primary);"></div>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
                // Chart Prep (Top 10 only)
                if (index < 10) {
                    chartLabels.push(item.name);
                    chartData.push(item.total.toFixed(0));
                }
            });

            tableHtml += `
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2">GRAND TOTALS</td>
                                <td style="text-align:center;">${grandQty}</td>
                                <td></td>
                                <td style="text-align:right;">${grandSub.toFixed(0)}</td>
                                <td style="text-align:right; font-size:1.1rem;">${grandTotal.toFixed(0)}</td>
                                <td style="text-align:right;">100%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div style="margin-top:30px; height:350px;">
                    <canvas id="repCanvas"></canvas>
                </div>
            `;
            chartType = 'bar';

        } 
        // ==================================================================
        // Standard "Sale by Day"
        // ==================================================================
        else if (activeReportName === 'Sale by Day') {
            let map = {};
            validHistory.forEach(h => {
                const dStr = new Date(h.date).toLocaleDateString();
                map[dStr] = (map[dStr] || 0) + h.total;
            });
            
            for(let k in map) {
                chartLabels.push(k);
                chartData.push(map[k].toFixed(0));
            }
            
            tableHtml = buildHtmlTable(['Date', 'Total Revenue (' + appSettings.property.currency + ')'], Object.keys(map).map(k =>[k, map[k].toFixed(0)]));
            tableHtml += `<div style="margin-top:30px; height:300px;"><canvas id="repCanvas"></canvas></div>`;
            chartType = 'line';
        }
        // ==================================================================
        // Standard "Sale by Category"
        // ==================================================================
        else if (activeReportName === 'Sale by Categories') {
            let map = {};
            validHistory.forEach(h => {
                let orderDisc = h.discountVal || 0;
                let orderSub = h.sub || 1;
                let discRatio = orderDisc / orderSub;

                h.items.forEach(i => {
                    const cat = menuCategories.find(c => c.id === menuItems.find(mi => mi.id === i.id)?.category);
                    const cName = cat ? cat.name : 'Unknown';
                    let itemActual = i.total - (i.total * discRatio);
                    map[cName] = (map[cName] || 0) + itemActual;
                });
            });
            
            for(let k in map) {
                chartLabels.push(k);
                chartData.push(map[k].toFixed(0));
            }
            tableHtml = buildHtmlTable(['Category', 'Total Revenue'], Object.keys(map).map(k =>[k, map[k].toFixed(0)]));
            tableHtml += `<div style="margin-top:30px; height:300px;"><canvas id="repCanvas"></canvas></div>`;
            chartType = 'pie';
        }
        else {
            // Empty State for unemplemented / external modules
            tableHtml = `
                <div style="text-align:center; padding:50px 20px; color:var(--text-secondary);">
                    <i class="fas fa-chart-pie" style="font-size:4rem; color:var(--bg-app); margin-bottom:20px; text-shadow: var(--neumorph-out-sm);"></i>
                    <h3 style="color:var(--text-primary); margin-bottom:10px;">Module Data Empty</h3>
                    <p style="font-size:0.9rem;">The report <b>"${activeReportName}"</b> requires external data entries or is still analyzing.</p>
                </div>
            `;
        }

        if (tableHtml === '' || tableHtml.includes('<tbody></tbody>')) {
            tableHtml = '<div style="text-align:center; padding:40px; color:var(--text-secondary);">No historical data available for selected date range.</div>';
        }

        contentBody.innerHTML = tableHtml;

        // Render Modern Chart
        if(chartLabels.length > 0) {
            setTimeout(() => {
                const ctx = document.getElementById('repCanvas');
                if(!ctx) return;
                if(window.repChartInstance) window.repChartInstance.destroy();
                
                const computed = getComputedStyle(document.body);
                const colPrim = computed.getPropertyValue('--col-primary').trim();
                const colPrimLight = computed.getPropertyValue('--col-primary-light').trim();
                const textColor = computed.getPropertyValue('--text-secondary').trim();

                window.repChartInstance = new Chart(ctx.getContext('2d'), {
                    type: chartType,
                    data: {
                        labels: chartLabels,
                        datasets:[{
                            label: `Revenue`,
                            data: chartData,
                            backgroundColor: chartType === 'pie' ?['#6750A4', '#03DAC6', '#E63946', '#2A9D8F', '#F72585'] : colPrimLight,
                            borderColor: chartType === 'pie' ? '#fff' : colPrim,
                            borderWidth: 2,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: chartType === 'pie' } },
                        scales: chartType === 'pie' ? {} : { 
                            y: { beginAtZero: true, ticks: { color: textColor } },
                            x: { ticks: { color: textColor } }
                        }
                    }
                });
            }, 100);
        }

    }, 200);
}

// Global Table Search Filter (For modern reports)
function filterReportTable() {
    const input = document.getElementById("rep-table-search");
    if(!input) return;
    const filter = input.value.toLowerCase();
    const trs = document.querySelectorAll(".rep-data-row");
    trs.forEach(tr => {
        let text = tr.innerText.toLowerCase();
        tr.style.display = text.includes(filter) ? "" : "none";
    });
}

function buildHtmlTable(headers, rows) {
    if(rows.length === 0) return '';
    let h = `<input type="text" class="adv-table-search" id="rep-table-search" placeholder="Search table..." oninput="filterReportTable()">
             <div style="overflow-x:auto;">
             <table class="data-table" id="export-table"><thead><tr>`;
    headers.forEach(text => h += `<th>${text}</th>`);
    h += `</tr></thead><tbody>`;
    rows.forEach(r => {
        h += `<tr class="rep-data-row">`;
        r.forEach(cell => h += `<td>${cell}</td>`);
        h += `</tr>`;
    });
    h += `</tbody></table></div>`;
    return h;
}

// EXPORTERS
function exportReport(type) {
    const title = activeReportName.replace(/\s+/g, '_');
    
    if (type === 'csv') {
        const table = document.getElementById('export-table');
        if(!table) return showToast("No tabular data to export");
        let csv =[];
        for(let i=0; i<table.rows.length; i++) {
            let row =[];
            for(let j=0; j<table.rows[i].cells.length; j++) row.push('"' + table.rows[i].cells[j].innerText.replace(/"/g, '""') + '"');
            csv.push(row.join(','));
        }
        const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${title}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    
    } else if (type === 'pdf') {
        const content = document.getElementById('export-table');
        if(!content) return showToast("No tabular data to export");
        const win = window.open('', '', 'width=800,height=600');
        win.document.write(`
            <html><head><title>${activeReportName}</title>
            <style>
                body{font-family:sans-serif; color:#333; padding:20px;} 
                table{width:100%; border-collapse:collapse; margin-top:20px;} 
                th,td{border:1px solid #ccc; padding:8px; text-align:left;} 
                th{background:#f4f4f4;}
            </style>
            </head><body>
            <h2>${activeReportName}</h2>
            <p>Report Range: ${document.getElementById('rep-start').value} to ${document.getElementById('rep-end').value}</p>
            <hr>
            ${content.outerHTML}
            </body></html>
        `);
        win.document.close();
        setTimeout(() => { win.print(); }, 500);

    } else if (type === 'txt') {
        const table = document.getElementById('export-table');
        if(!table) return showToast("No tabular data to export");
        let txt = `${activeReportName.toUpperCase()}\n----------------------------------------\n`;
        for(let i=0; i<table.rows.length; i++) {
            let row =[];
            for(let j=0; j<table.rows[i].cells.length; j++) row.push(table.rows[i].cells[j].innerText.padEnd(20));
            txt += row.join(' | ') + '\n';
            if(i === 0) txt += '----------------------------------------\n';
        }
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title}.txt`;
        link.click();

    } else if (type === 'html') {
        const table = document.getElementById('export-table');
        if(!table) return showToast("No tabular data to export");
        const blob = new Blob([`<html><head><title>${title}</title><style>table{width:100%;border-collapse:collapse;}th,td{border:1px solid #000;padding:8px;}</style></head><body><h2>${activeReportName}</h2>${table.outerHTML}</body></html>`], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title}.html`;
        link.click();
    }
}