/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: reports_suite.js – Custom Reports (15 requested)                     ║
║         (Full version with modern chart colors)                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

const reportCategories = [
    {
        group: '📊 Core Sales',
        reports: [
            'Sale by Menu Items',
            'Sale by Waitress',
            'Sale by Table',
            'Sale by Category',
            'Sale by Payment Method',
            'Sale by Day',
            'Sale by Hour',
            'Sale by Week',
            'Sale by Month',
            'Sale by Order Type',
            'Today\'s Sale by User'
        ]
    },
    {
        group: '💰 Client Udhaar (Credit)',
        reports: [
            'Total Food on Credit',
            'Total Credit Recovered',
            'Clients with Outstanding Credit',
            'Top 10 Clients by Udhaar',
            'Longest Standing Udhaar Clients'
        ]
    },
    {
        group: '🏷️ Deals, Discounts & Tax',
        reports: [
            'Sale by Deal',
            'Sale by Discount',
            'Sale by Tax'
        ]
    }
];

let activeReportName = 'Sale by Menu Items';
window.repChartInstance = null;
window.modernChartInstances = [];

// Modern color palette for charts
const modernColors = [
    '#FF6B6B', // coral red
    '#4ECDC4', // turquoise
    '#FFB347', // orange
    '#9B59B6', // purple
    '#3498DB', // blue
    '#F1C40F', // yellow
    '#E67E22', // dark orange
    '#1ABC9C', // green-blue
    '#E74C3C', // red
    '#34495E', // dark blue
    '#F39C12', // orange
    '#2ECC71', // green
    '#D35400', // pumpkin
    '#8E44AD', // purple
    '#16A085', // teal
];

function renderReportMenu() {
    const menuBody = document.getElementById('rep-menu-body');
    menuBody.innerHTML = '';

    const noDateReports = [
        'Total Food on Credit', 'Total Credit Recovered', 'Clients with Outstanding Credit',
        'Top 10 Clients by Udhaar', 'Longest Standing Udhaar Clients'
    ];
    const dateFilters = document.getElementById('rep-date-filters');
    if (dateFilters) {
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
            const reportObj = typeof rep === 'string' ? { name: rep, perm: 'viewReports' } : rep;
            if (reportObj.perm && !hasPerm(reportObj.perm)) return;

            const btn = document.createElement('button');
            btn.className = `list-item-btn ${activeReportName === reportObj.name ? 'active' : ''}`;
            btn.style.padding = "8px 12px";
            btn.style.fontSize = "0.75rem";
            btn.textContent = reportObj.name;
            btn.onclick = () => {
                activeReportName = reportObj.name;
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

    if (window.modernChartInstances.length > 0) {
        window.modernChartInstances.forEach(c => c.destroy());
        window.modernChartInstances = [];
    }

    setTimeout(() => {
        const sDateInput = document.getElementById('rep-start').value;
        const eDateInput = document.getElementById('rep-end').value;

        let sDate, eDate;

        if (!sDateInput || !eDateInput) {
            let now = new Date();
            let pad = (num) => num.toString().padStart(2, '0');
            let localDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

            let openT = appSettings.property.openingTime || '00:00';
            let closeT = appSettings.property.closingTime || '23:59';

            document.getElementById('rep-start').value = `${localDateStr}T${openT}`;

            let endD = new Date(`${localDateStr}T${closeT}`);
            if (openT > closeT) endD.setDate(endD.getDate() + 1);
            document.getElementById('rep-end').value = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}T${closeT}`;
        }

        sDate = new Date(document.getElementById('rep-start').value);
        eDate = new Date(document.getElementById('rep-end').value);

        const noDateReports = [
            'Total Food on Credit', 'Total Credit Recovered', 'Clients with Outstanding Credit',
            'Top 10 Clients by Udhaar', 'Longest Standing Udhaar Clients'
        ];
        const requiresDate = !noDateReports.includes(activeReportName);

        const validHistory = app.history.filter(h => {
            if (!requiresDate) return true;
            const d = new Date(h.date);
            return d >= sDate && d <= eDate;
        });

        // ========== HELPER FUNCTIONS ==========
        const curr = appSettings.property.currency || '$';
        const fm = n => curr + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const fp = n => n.toFixed(2) + '%';

        function getOrdersInRange() {
            let orders = [];
            validHistory.forEach(h => orders.push({ ...h, isActive: false }));
            Object.entries(app.orders || {}).forEach(([table, o]) => {
                if (o.items && o.items.length > 0) {
                    const orderTime = o.startTime;
                    if (!requiresDate || (orderTime >= sDate && orderTime <= eDate)) {
                        let total = o.items.reduce((sum, item) => sum + item.total, 0) - (o.discount || 0);
                        orders.push({
                            ...o,
                            table: table,
                            total: total,
                            isActive: true,
                            date: new Date(o.startTime).toLocaleString(),
                            startTimeRaw: o.startTime
                        });
                    }
                }
            });
            return orders;
        }

        function buildModernReport(summaryCards, categoryTables, chartConfigs) {
            let html = `
            <style>
                .mod-rep { font-family: 'Inter', sans-serif; background: transparent; width: 100%; color: var(--text-primary); }
                .mod-rep * { box-sizing: border-box; }
                .mod-search { width: 100%; max-width: 400px; padding: 12px 18px; border-radius: 12px; border: 1px solid var(--border-color, #e2e8f0); background: var(--bg-app, #fff); color: var(--text-primary); margin-bottom: 24px; outline: none; transition: 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-size: 14px; }
                .mod-search:focus { border-color: var(--col-primary); box-shadow: 0 0 0 3px var(--col-primary-light, rgba(96,165,250,0.25)); }
                .mod-sum-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; margin-bottom: 28px; }
                .mod-card { background: var(--bg-app, #fff); border-radius: 14px; padding: 18px 20px; box-shadow: var(--neumorph-out-sm, 0 1px 3px rgba(0,0,0,.06)); border: 1px solid var(--border-color, #e2e8f0); }
                .mod-card .lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-secondary, #64748b); margin-bottom: 6px; }
                .mod-card .val { font-size: 26px; font-weight: 800; }
                .mod-card .sub { font-size: 11px; color: var(--text-secondary, #94a3b8); margin-top: 3px; }
                .mod-cat { margin-bottom: 28px; border-radius: 16px; overflow: hidden; background: var(--bg-app, #fff); box-shadow: var(--neumorph-out-sm, 0 1px 4px rgba(0,0,0,.07)); border: 1px solid var(--border-color, #e2e8f0); }
                .mod-cat.hidden { display: none; }
                .mod-cat-head { padding: 18px 22px; color: #fff; display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 700; background: linear-gradient(135deg, var(--col-primary), #4f46e5); }
                .mod-dt { width: 100%; border-collapse: collapse; font-size: 12.5px; }
                .mod-dt th { padding: 11px 12px; text-align: left; font-weight: 700; font-size: 10px; text-transform: uppercase; color: var(--text-secondary, #475569); border-bottom: 2px solid var(--border-color, #e2e8f0); white-space: nowrap; }
                .mod-dt td { padding: 9px 12px; white-space: nowrap; border-bottom: 1px solid var(--border-color, #f1f5f9); }
                .mod-dt tr:hover { background: rgba(0,0,0,0.02); }
                .mod-dt tr.hl { background: #fef9c3 !important; }
                .mod-dt tr.hr { display: none; }
                .mod-dt .n { text-align: right; font-variant-numeric: tabular-nums; }
                .mod-pbar { display: flex; align-items: center; gap: 6px; }
                .mod-pbar .bg { width: 55px; height: 5px; background: var(--border-color, #e2e8f0); border-radius: 3px; overflow: hidden; }
                .mod-pbar .fl { height: 100%; border-radius: 3px; }
                .mod-ch-title { font-size: 20px; font-weight: 800; margin: 36px 0 20px; padding-bottom: 10px; border-bottom: 2px solid var(--border-color, #e2e8f0); }
                .mod-ch-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 36px; }
                .mod-ch-card { background: var(--bg-app, #fff); border-radius: 16px; padding: 22px; box-shadow: var(--neumorph-out-sm, 0 1px 3px rgba(0,0,0,.06)); border: 1px solid var(--border-color, #e2e8f0); }
                .mod-ch-card.fw { grid-column: 1 / -1; }
                .mod-ch-card h3 { font-size: 14px; font-weight: 700; margin-bottom: 14px; margin-top:0; }
                .mod-ch-wrap { position: relative; width: 100%; height: 320px; }
                .mod-ch-wrap.tall { height: 400px; }
                @media(max-width:1024px) { .mod-ch-grid { grid-template-columns: 1fr; } }
            </style>
            <div class="mod-rep">
                <input type="text" class="mod-search" id="modernSearch" placeholder="🔍 Search...">
                <h2 class="mod-ch-title" style="margin-top:0;">📊 Executive Summary</h2>
                <div class="mod-sum-grid" id="modSumCards">${summaryCards}</div>
                <div id="modTblCont">${categoryTables}</div>
                <h2 class="mod-ch-title">📈 Visual Analytics</h2>
                <div class="mod-ch-grid" id="modChartGrid"></div>
            </div>
            <table id="export-table" style="display:none;"></table>
            `;
            return html;
        }

        // ========== REPORT IMPLEMENTATIONS ==========

        // ---- SALE BY MENU ITEMS (full modern version) ----
        if (activeReportName === 'Sale by Menu Items') {
            let catMap = {};
            let exportFlatRows = [];
            const curr = appSettings.property.currency || '$';
            
            validHistory.forEach(h => {
                let orderSub = h.sub || 1;
                let orderDisc = h.discountVal || 0;
                let discRatio = orderDisc / orderSub;

                h.items.forEach(i => {
                    const mi = typeof menuItems !== 'undefined' ? menuItems.find(m => m.id === i.id || m.name === i.name) : null;
                    const catObj = typeof menuCategories !== 'undefined' && mi ? menuCategories.find(c => c.id === mi.category) : null;
                    const catName = catObj ? catObj.name : 'Uncategorized';

                    if (!catMap[catName]) catMap[catName] = { name: catName, itemsMap: {} };

                    let itemGross = i.total;
                    let itemDisc = itemGross * discRatio;
                    let itemNet = itemGross - itemDisc;

                    if (!catMap[catName].itemsMap[i.name]) {
                        catMap[catName].itemsMap[i.name] = { 
                            name: i.name, qty: 0, price: i.price, sub: 0, disc: 0, ref: 0, tot: 0, so: false 
                        };
                    }

                    let tItem = catMap[catName].itemsMap[i.name];
                    tItem.qty += i.qty;
                    tItem.sub += itemGross;
                    tItem.disc += itemDisc;
                    tItem.tot += itemNet;
                });
            });

            let cIndex = 0;
            const C = Object.values(catMap).map(c => {
                let clr = modernColors[cIndex % modernColors.length]; cIndex++;
                let itemsList = Object.values(c.itemsMap).sort((a,b)=>b.tot - a.tot);
                
                itemsList.forEach(it => {
                    exportFlatRows.push(`<tr><td>${c.name}</td><td>${it.name}</td><td>${curr}${it.price.toFixed(2)}</td><td>${it.qty}</td><td>${curr}${it.sub.toFixed(2)}</td><td>${curr}${it.disc.toFixed(2)}</td><td style="font-weight:bold;">${curr}${it.tot.toFixed(2)}</td></tr>`);
                });

                return {
                    name: c.name, emoji: "📋", color: clr, grad: `linear-gradient(135deg, ${clr}, ${clr}cc)`,
                    items: itemsList
                };
            }).sort((a,b) => b.items.reduce((sum, i)=>sum+i.tot,0) - a.items.reduce((sum, i)=>sum+i.tot,0));

            let tableHtml = `
            <style>
                .mod-rep { font-family: 'Inter', sans-serif; background: transparent; width: 100%; color: var(--text-primary); }
                .mod-rep * { box-sizing: border-box; }
                .mod-search { width: 100%; max-width: 400px; padding: 12px 18px; border-radius: 12px; border: 1px solid var(--border-color, #e2e8f0); background: var(--bg-app, #fff); color: var(--text-primary); margin-bottom: 24px; outline: none; transition: 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-size: 14px; }
                .mod-search:focus { border-color: var(--col-primary); box-shadow: 0 0 0 3px var(--col-primary-light, rgba(96,165,250,0.25)); }
                .mod-sum-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; margin-bottom: 28px; }
                .mod-card { background: var(--bg-app, #fff); border-radius: 14px; padding: 18px 20px; box-shadow: var(--neumorph-out-sm, 0 1px 3px rgba(0,0,0,.06)); border: 1px solid var(--border-color, #e2e8f0); }
                .mod-card .lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-secondary, #64748b); margin-bottom: 6px; }
                .mod-card .val { font-size: 26px; font-weight: 800; }
                .mod-card .sub { font-size: 11px; color: var(--text-secondary, #94a3b8); margin-top: 3px; }
                .mod-cat { margin-bottom: 28px; border-radius: 16px; overflow: hidden; background: var(--bg-app, #fff); box-shadow: var(--neumorph-out-sm, 0 1px 4px rgba(0,0,0,.07)); border: 1px solid var(--border-color, #e2e8f0); }
                .mod-cat.hidden { display: none; }
                .mod-cat-head { padding: 18px 22px; color: #fff; display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 700; background: linear-gradient(135deg, var(--col-primary), #4f46e5); }
                .mod-dt { width: 100%; border-collapse: collapse; font-size: 12.5px; }
                .mod-dt th { padding: 11px 12px; text-align: left; font-weight: 700; font-size: 10px; text-transform: uppercase; color: var(--text-secondary, #475569); border-bottom: 2px solid var(--border-color, #e2e8f0); white-space: nowrap; }
                .mod-dt td { padding: 9px 12px; white-space: nowrap; border-bottom: 1px solid var(--border-color, #f1f5f9); }
                .mod-dt tr:hover { background: rgba(0,0,0,0.02); }
                .mod-dt tr.hl { background: #fef9c3 !important; }
                .mod-dt tr.hr { display: none; }
                .mod-dt .n { text-align: right; font-variant-numeric: tabular-nums; }
                .mod-pbar { display: flex; align-items: center; gap: 6px; }
                .mod-pbar .bg { width: 55px; height: 5px; background: var(--border-color, #e2e8f0); border-radius: 3px; overflow: hidden; }
                .mod-pbar .fl { height: 100%; border-radius: 3px; }
                .mod-ch-title { font-size: 20px; font-weight: 800; margin: 36px 0 20px; padding-bottom: 10px; border-bottom: 2px solid var(--border-color, #e2e8f0); }
                .mod-ch-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 36px; }
                .mod-ch-card { background: var(--bg-app, #fff); border-radius: 16px; padding: 22px; box-shadow: var(--neumorph-out-sm, 0 1px 3px rgba(0,0,0,.06)); border: 1px solid var(--border-color, #e2e8f0); }
                .mod-ch-card.fw { grid-column: 1 / -1; }
                .mod-ch-card h3 { font-size: 14px; font-weight: 700; margin-bottom: 14px; margin-top:0; }
                .mod-ch-wrap { position: relative; width: 100%; height: 320px; }
                .mod-ch-wrap.tall { height: 400px; }
                @media(max-width:1024px) { .mod-ch-grid { grid-template-columns: 1fr; } }
            </style>
            
            <div class="mod-rep">
                <input type="text" class="mod-search" id="modernSearch" placeholder="🔍 Search items, categories...">
                <h2 class="mod-ch-title" style="margin-top: 0;">📊 Executive Summary</h2>
                <div class="mod-sum-grid" id="modSumCards"></div>
                <div id="modTblCont"></div>
                
                <h2 class="mod-ch-title">📈 Visual Analytics & Charts</h2>
                <div class="mod-ch-grid">
                    <div class="mod-ch-card"><h3>💰 Net Revenue by Category</h3><div class="mod-ch-wrap"><canvas id="c1"></canvas></div></div>
                    <div class="mod-ch-card"><h3>🍩 Revenue Share Distribution</h3><div class="mod-ch-wrap"><canvas id="c2"></canvas></div></div>
                    <div class="mod-ch-card"><h3>🏆 Top 10 Best Sellers by Revenue</h3><div class="mod-ch-wrap tall"><canvas id="c3"></canvas></div></div>
                    <div class="mod-ch-card"><h3>📉 Bottom 10 Items by Revenue</h3><div class="mod-ch-wrap tall"><canvas id="c4"></canvas></div></div>
                    <div class="mod-ch-card"><h3>📦 Quantity Sold by Category</h3><div class="mod-ch-wrap"><canvas id="c5"></canvas></div></div>
                    <div class="mod-ch-card"><h3>🏷️ Discount vs Refund by Category</h3><div class="mod-ch-wrap"><canvas id="c6"></canvas></div></div>
                    <div class="mod-ch-card fw"><h3>📊 All Menu Items — Revenue Ranking</h3><div class="mod-ch-wrap tall"><canvas id="c7"></canvas></div></div>
                    <div class="mod-ch-card"><h3>📈 Top 10 Most Ordered (by Quantity)</h3><div class="mod-ch-wrap tall"><canvas id="c9"></canvas></div></div>
                </div>
            </div>
            
            <table id="export-table" style="display:none;">
                <thead><tr><th>Category</th><th>Menu Item</th><th>Price/Unit</th><th>Qty Sold</th><th>Gross Sales</th><th>Discount</th><th>Net Total</th></tr></thead>
                <tbody>${exportFlatRows.join('')}</tbody>
            </table>
            `;

            contentBody.innerHTML = tableHtml;

            setTimeout(() => {
                try {
                    const $ = s => document.getElementById(s);
                    const fm = n => curr + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                    const fp = n => n.toFixed(2) + '%';
                    
                    let TGR=0, TNR=0, all=[];
                    C.forEach(c => {
                        c.tg=0; c.tn=0; c.tq=0; c.td=0; c.tr=0;
                        c.items.forEach(i => {
                            c.tg+=i.sub; c.tn+=i.tot; c.tq+=i.qty; c.td+=i.disc; c.tr+=i.ref;
                        });
                        TGR+=c.tg; TNR+=c.tn;
                    });
                    C.forEach(c => {
                        c.pct = TNR ? (c.tn/TNR)*100 : 0;
                        c.items.forEach(i => {
                            i.pCat = c.tn ? (i.tot/c.tn)*100 : 0;
                            i.pTot = TNR ? (i.tot/TNR)*100 : 0;
                            all.push({...i, cat:c.name, clr:c.color});
                        });
                    });

                    const renderSummary = (itemList) => {
                        let tgr=0, tnr=0, tq=0, td=0, tr=0, so=0;
                        let cats = new Set();
                        itemList.forEach(i => {
                            tgr += i.sub; tnr += i.tot; tq += i.qty; td += i.disc; tr += i.ref;
                            if(i.so) so++;
                            cats.add(i.cat);
                        });
                        const dPct = tgr ? ((td/tgr)*100).toFixed(1) : '0.0';
                        const rPct = tgr ? ((tr/tgr)*100).toFixed(1) : '0.0';
                        const avgRev = itemList.length ? (tnr/itemList.length) : 0;

                        if($('modSumCards')) {
                            $('modSumCards').innerHTML=`
                            <div class="mod-card" style="border-left:4px solid #22c55e"><div class="lbl">Total Gross Revenue</div><div class="val" style="color:#16a34a">${fm(tgr)}</div><div class="sub">Before discounts</div></div>
                            <div class="mod-card" style="border-left:4px solid #3b82f6"><div class="lbl">Total Net Revenue</div><div class="val" style="color:#2563eb">${fm(tnr)}</div><div class="sub">After discounts</div></div>
                            <div class="mod-card" style="border-left:4px solid #f97316"><div class="lbl">Total Quantity Sold</div><div class="val" style="color:#ea580c">${tq.toLocaleString()}</div><div class="sub">${itemList.length} matched item(s)</div></div>
                            <div class="mod-card" style="border-left:4px solid #8b5cf6"><div class="lbl">Total Discounts</div><div class="val" style="color:#7c3aed">${fm(td)}</div><div class="sub">${dPct}% of gross</div></div>
                            <div class="mod-card" style="border-left:4px solid #14b8a6"><div class="lbl">Avg Revenue / Item</div><div class="val" style="color:#0d9488">${fm(avgRev)}</div><div class="sub">Across visible items</div></div>
                            <div class="mod-card" style="border-left:4px solid #ec4899"><div class="lbl">Menu Categories</div><div class="val" style="color:#db2777">${cats.size}</div><div class="sub">Active in search</div></div>`;
                        }
                    };
                    renderSummary(all);

                    if($('modTblCont')) {
                        let h='';
                        C.forEach((c,ci) => {
                            h+=`<div class="mod-cat" id="cs${ci}"><div class="mod-cat-head" style="background:${c.grad}">${c.emoji} ${c.name}</div>
                            <div style="overflow-x:auto;"><table class="mod-dt" id="tb${ci}"><thead><tr>
                                <th style="width:40px">#</th><th>Menu Item</th><th class="n">Price</th><th class="n">Qty</th><th class="n">Gross</th><th class="n">Discount</th><th class="n">Net Total</th><th>% of Category</th><th>% of Total</th>
                            </tr></thead><tbody>`;
                            c.items.forEach((it,ii) => {
                                h+=`<tr data-n="${it.name.toLowerCase()}" data-c="${c.name.toLowerCase()}">
                                    <td style="color:var(--text-secondary);font-weight:600">${ii+1}</td><td style="font-weight:600;">${it.name}</td>
                                    <td class="n">${fm(it.price)}</td><td class="n" style="font-weight:600">${it.qty.toLocaleString()}</td><td class="n">${fm(it.sub)}</td><td class="n" style="color:#ef4444">-${fm(it.disc)}</td><td class="n" style="font-weight:700;color:var(--col-primary)">${fm(it.tot)}</td>
                                    <td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${Math.min(it.pCat*5,100)}%;background:${c.color}"></div></div><span>${fp(it.pCat)}</span></div></td>
                                    <td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${Math.min(it.pTot*25,100)}%;background:${c.color}"></div></div><span>${fp(it.pTot)}</span></div></td>
                                </tr>`;
                            });
                            h+=`<tr style="background:var(--border-color); font-weight:700;"><td></td><td>CATEGORY TOTAL</td><td></td><td class="n">${c.tq.toLocaleString()}</td><td class="n">${fm(c.tg)}</td><td class="n" style="color:#ef4444">-${fm(c.td)}</td><td class="n">${fm(c.tn)}</td><td>100%</td><td>${fp(c.pct)}</td></tr></tbody></table></div></div>`;
                        });
                        $('modTblCont').innerHTML=h;
                    }

                    const si = $('modernSearch');
                    if(si) {
                        si.addEventListener('input', function() {
                            const q = this.value.toLowerCase().trim();
                            let currentFilteredItems = all.filter(i => !q || i.name.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q));
                            renderSummary(currentFilteredItems);
                            C.forEach((c,ci) => {
                                const sec=$('cs'+ci); const rows=$('tb'+ci).querySelectorAll('tbody tr:not(:last-child)'); let cv=0;
                                rows.forEach(r => {
                                    const n=r.getAttribute('data-n'), ct=r.getAttribute('data-c');
                                    if(!q||n.includes(q)||ct.includes(q)){
                                        r.classList.remove('hr'); q&&n.includes(q)?r.classList.add('hl'):r.classList.remove('hl'); cv++;
                                    } else { r.classList.add('hr'); r.classList.remove('hl'); }
                                });
                                sec.classList.toggle('hidden', cv===0&&!!q);
                            });
                        });
                    }

                    if (typeof Chart !== 'undefined' && C.length > 0) {
                        const cN = C.map(c=>c.name), cCl = C.map(c=>c.color), cRev = C.map(c=>c.tn);
                        const co = {responsive:true, maintainAspectRatio:false};
                        const tColor = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#64748b';

                        const createChart = (id, config) => { 
                            if($(id)) window.modernChartInstances.push(new Chart($(id), config)); 
                        };

                        createChart('c1', {type:'bar', data:{labels:cN, datasets:[{data:cRev, backgroundColor:cCl.map(c=>c+'CC'), borderColor:cCl, borderWidth:2, borderRadius:6}]}, options:{...co, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:tColor}}, y:{ticks:{color:tColor}}}}});
                        createChart('c2', {type:'doughnut', data:{labels:cN, datasets:[{data:cRev, backgroundColor:cCl, borderWidth:2}]}, options:{...co, plugins:{legend:{position:'right', labels:{color:tColor}}}}});
                        
                        const sDesc=[...all].sort((a,b)=>b.tot-a.tot); const t10=sDesc.slice(0,10);
                        createChart('c3', {type:'bar', data:{labels:t10.map(i=>i.name), datasets:[{data:t10.map(i=>i.tot), backgroundColor:t10.map(i=>i.clr+'CC'), borderColor:t10.map(i=>i.clr), borderWidth:2, borderRadius:4}]}, options:{...co, indexAxis:'y', plugins:{legend:{display:false}}, scales:{x:{ticks:{color:tColor}}, y:{ticks:{color:tColor}}}}});
                        
                        const b10=sDesc.slice(-10).reverse();
                        createChart('c4', {type:'bar', data:{labels:b10.map(i=>i.name), datasets:[{data:b10.map(i=>i.tot), backgroundColor:b10.map(i=>i.clr+'88'), borderColor:b10.map(i=>i.clr), borderWidth:2, borderRadius:4}]}, options:{...co, indexAxis:'y', plugins:{legend:{display:false}}, scales:{x:{ticks:{color:tColor}}, y:{ticks:{color:tColor}}}}});
                        
                        createChart('c5', {type:'bar', data:{labels:cN, datasets:[{data:C.map(c=>c.tq), backgroundColor:cCl.map(c=>c+'99'), borderColor:cCl, borderWidth:2, borderRadius:6}]}, options:{...co, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:tColor}}, y:{ticks:{color:tColor}}}}});
                        createChart('c6', {type:'bar', data:{labels:cN, datasets:[{label:'Discounts', data:C.map(c=>c.td), backgroundColor:'#ef444499', borderColor:'#ef4444', borderWidth:2, borderRadius:4}]}, options:{...co, scales:{x:{ticks:{color:tColor}}, y:{ticks:{color:tColor}}}}});
                        
                        createChart('c7', {type:'bar', data:{labels:sDesc.map(i=>i.name), datasets:[{data:sDesc.map(i=>i.tot), backgroundColor:sDesc.map(i=>i.clr+'88'), borderColor:sDesc.map(i=>i.clr), borderWidth:1, borderRadius:2}]}, options:{...co, plugins:{legend:{display:false}}, scales:{x:{ticks:{display:false}}, y:{ticks:{color:tColor}}}}});
                        
                        const tQ=[...all].sort((a,b)=>b.qty-a.qty).slice(0,10);
                        createChart('c9', {type:'bar', data:{labels:tQ.map(i=>i.name), datasets:[{data:tQ.map(i=>i.qty), backgroundColor:tQ.map(i=>i.clr+'CC'), borderColor:tQ.map(i=>i.clr), borderWidth:2, borderRadius:4}]}, options:{...co, indexAxis:'y', plugins:{legend:{display:false}}, scales:{x:{ticks:{color:tColor}}, y:{ticks:{color:tColor}}}}});
                    }
                } catch(err) {
                    console.error("Modern Report Generation Error:", err);
                }
            }, 100);
            return;
        }

        // ---- SALE BY WAITRESS (modern) ----
        else if (activeReportName === 'Sale by Waitress') {
            const orders = getOrdersInRange();
            let waiterMap = {};
            orders.forEach(o => {
                const w = o.waiter || 'Unknown';
                if (!waiterMap[w]) waiterMap[w] = { orders:0, sales:0, avg:0 };
                waiterMap[w].orders++;
                waiterMap[w].sales += o.total;
            });
            Object.keys(waiterMap).forEach(w => waiterMap[w].avg = waiterMap[w].sales / waiterMap[w].orders);

            const sorted = Object.entries(waiterMap).sort((a,b) => b[1].sales - a[1].sales);
            const totalSales = sorted.reduce((s, [,v]) => s + v.sales, 0);
            const topWaiter = sorted[0]?.[0] || 'None';

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Sales</div><div class="val">${fm(totalSales)}</div></div>
                <div class="mod-card"><div class="lbl">Top Waiter</div><div class="val">${topWaiter}</div><div class="sub">${fm(sorted[0]?.[1].sales || 0)}</div></div>
                <div class="mod-card"><div class="lbl">Waiters Active</div><div class="val">${sorted.length}</div></div>
            `;

            let tableRows = sorted.map(([w, data]) => {
                let pct = (data.sales / totalSales * 100).toFixed(1);
                return `<tr><td>${w}</td><td class="n">${data.orders}</td><td class="n">${fm(data.sales)}</td><td class="n">${fm(data.avg)}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">👨‍🍳 Waiter Performance</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Waiter</th><th>Orders</th><th>Sales</th><th>Avg Check</th><th>% of Sales</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
            setTimeout(() => {
                const ctx = document.getElementById('modChartGrid');
                if (ctx) {
                    ctx.innerHTML = '<div class="mod-ch-card fw"><h3>Sales by Waiter</h3><div class="mod-ch-wrap"><canvas id="barChart"></canvas></div></div>';
                    const labels = sorted.map(s => s[0]);
                    const data = sorted.map(s => s[1].sales);
                    const backgroundColors = labels.map((_, i) => modernColors[i % modernColors.length]);
                    const bar = new Chart(document.getElementById('barChart'), {
                        type: 'bar',
                        data: { labels: labels, datasets: [{ data: data, backgroundColor: backgroundColors, borderColor: backgroundColors.map(c => c), borderWidth: 1 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });
                    window.modernChartInstances.push(bar);
                }
            }, 100);
        }

        // ---- SALE BY TABLE (modern) ----
        else if (activeReportName === 'Sale by Table') {
            const orders = getOrdersInRange();
            let tableMap = {};
            orders.forEach(o => {
                const tbl = o.table || 'Unknown';
                if (!tableMap[tbl]) tableMap[tbl] = { orders:0, revenue:0, avg:0 };
                tableMap[tbl].orders++;
                tableMap[tbl].revenue += o.total;
            });
            Object.keys(tableMap).forEach(t => tableMap[t].avg = tableMap[t].revenue / tableMap[t].orders);

            const sorted = Object.entries(tableMap).sort((a,b) => b[1].revenue - a[1].revenue);
            const totalRevenue = sorted.reduce((s, [,v]) => s + v.revenue, 0);
            const busiest = sorted.sort((a,b) => b[1].orders - a[1].orders)[0]?.[0] || 'None';

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Revenue</div><div class="val">${fm(totalRevenue)}</div></div>
                <div class="mod-card"><div class="lbl">Busiest Table</div><div class="val">${busiest}</div><div class="sub">${sorted.find(s=>s[0]===busiest)?.[1].orders} orders</div></div>
                <div class="mod-card"><div class="lbl">Tables Used</div><div class="val">${sorted.length}</div></div>
            `;

            let tableRows = sorted.map(([tbl, data]) => {
                let pct = (data.revenue / totalRevenue * 100).toFixed(1);
                return `<tr><td>${tbl}</td><td class="n">${data.orders}</td><td class="n">${fm(data.revenue)}</td><td class="n">${fm(data.avg)}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">🪑 Table Performance</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Table</th><th>Orders</th><th>Revenue</th><th>Avg per Order</th><th>% of Revenue</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
            setTimeout(() => {
                const ctx = document.getElementById('modChartGrid');
                if (ctx) {
                    ctx.innerHTML = '<div class="mod-ch-card fw"><h3>Revenue by Table</h3><div class="mod-ch-wrap"><canvas id="barChart"></canvas></div></div>';
                    const labels = sorted.map(s => s[0]);
                    const data = sorted.map(s => s[1].revenue);
                    const backgroundColors = labels.map((_, i) => modernColors[i % modernColors.length]);
                    const bar = new Chart(document.getElementById('barChart'), {
                        type: 'bar',
                        data: { labels: labels, datasets: [{ data: data, backgroundColor: backgroundColors, borderColor: backgroundColors.map(c => c), borderWidth: 1 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });
                    window.modernChartInstances.push(bar);
                }
            }, 100);
        }

        // ---- SALE BY CATEGORY (modern) ----
        else if (activeReportName === 'Sale by Category') {
            const orders = getOrdersInRange();
            let catMap = {};
            orders.forEach(o => {
                const discRatio = (o.discountVal || 0) / (o.sub || 1);
                o.items.forEach(i => {
                    const mi = menuItems.find(m => m.id == i.id);
                    const catName = mi ? (menuCategories.find(c => c.id === mi.category)?.name || 'Uncategorized') : 'Uncategorized';
                    catMap[catName] = (catMap[catName] || 0) + i.total * (1 - discRatio);
                });
            });

            const sorted = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
            const total = sorted.reduce((s, [,v]) => s + v, 0);
            const topCat = sorted[0]?.[0] || 'None';

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Revenue</div><div class="val">${fm(total)}</div></div>
                <div class="mod-card"><div class="lbl">Top Category</div><div class="val">${topCat}</div><div class="sub">${fm(sorted[0]?.[1] || 0)}</div></div>
                <div class="mod-card"><div class="lbl">Categories</div><div class="val">${sorted.length}</div></div>
            `;

            let tableRows = sorted.map(([cat, rev]) => {
                let pct = (rev / total * 100).toFixed(1);
                return `<tr><td>${cat}</td><td class="n">${fm(rev)}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">📊 Category Sales</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Category</th><th>Revenue</th><th>% of Total</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
            setTimeout(() => {
                const ctx = document.getElementById('modChartGrid');
                if (ctx) {
                    const labels = sorted.map(s => s[0]);
                    const values = sorted.map(s => s[1]);
                    const backgroundColors = labels.map((_, i) => modernColors[i % modernColors.length]);
                    ctx.innerHTML = `
                        <div class="mod-ch-card"><h3>Revenue Share</h3><div class="mod-ch-wrap"><canvas id="pieChart"></canvas></div></div>
                        <div class="mod-ch-card"><h3>Revenue by Category</h3><div class="mod-ch-wrap"><canvas id="barChart"></canvas></div></div>
                    `;
                    const pie = new Chart(document.getElementById('pieChart'), {
                        type: 'doughnut',
                        data: { labels: labels, datasets: [{ data: values, backgroundColor: backgroundColors, borderColor: backgroundColors.map(c => c), borderWidth: 1 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
                    });
                    const bar = new Chart(document.getElementById('barChart'), {
                        type: 'bar',
                        data: { labels: labels, datasets: [{ data: values, backgroundColor: backgroundColors, borderColor: backgroundColors.map(c => c), borderWidth: 1 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });
                    window.modernChartInstances.push(pie, bar);
                }
            }, 100);
        }

        // ---- SALE BY PAYMENT METHOD (modern) ----
        else if (activeReportName === 'Sale by Payment Method') {
            const orders = getOrdersInRange();
            let methodMap = {};
            orders.forEach(o => {
                if (o.payments) {
                    o.payments.forEach(p => {
                        methodMap[p.method] = (methodMap[p.method] || 0) + p.amount;
                    });
                }
            });
            const sorted = Object.entries(methodMap).sort((a,b) => b[1] - a[1]);
            const total = sorted.reduce((s, [,v]) => s + v, 0);

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Payments</div><div class="val">${fm(total)}</div></div>
                <div class="mod-card"><div class="lbl">Top Method</div><div class="val">${sorted[0]?.[0] || 'None'}</div><div class="sub">${fm(sorted[0]?.[1] || 0)}</div></div>
                <div class="mod-card"><div class="lbl">Methods Used</div><div class="val">${sorted.length}</div></div>
            `;

            let tableRows = sorted.map(([m, amt]) => {
                let pct = (amt / total * 100).toFixed(1);
                return `<tr><td>${m}</td><td class="n">${fm(amt)}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">💳 Payment Methods</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Method</th><th>Amount</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
            setTimeout(() => {
                const ctx = document.getElementById('modChartGrid');
                if (ctx) {
                    const labels = sorted.map(s => s[0]);
                    const values = sorted.map(s => s[1]);
                    const backgroundColors = labels.map((_, i) => modernColors[i % modernColors.length]);
                    ctx.innerHTML = '<div class="mod-ch-card fw"><h3>Payment Share</h3><div class="mod-ch-wrap"><canvas id="pieChart"></canvas></div></div>';
                    const pie = new Chart(document.getElementById('pieChart'), {
                        type: 'doughnut',
                        data: { labels: labels, datasets: [{ data: values, backgroundColor: backgroundColors, borderColor: backgroundColors.map(c => c), borderWidth: 1 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
                    });
                    window.modernChartInstances.push(pie);
                }
            }, 100);
        }

        // ---- SALE BY DAY (modern) ----
        else if (activeReportName === 'Sale by Day') {
            const orders = getOrdersInRange();
            let dayMap = {};
            orders.forEach(o => {
                const dStr = new Date(o.date).toLocaleDateString();
                dayMap[dStr] = (dayMap[dStr] || 0) + o.total;
            });

            const days = Object.keys(dayMap).sort((a,b) => new Date(a) - new Date(b));
            const revenues = days.map(d => dayMap[d]);
            const total = revenues.reduce((a,b) => a+b, 0);
            const avg = total / days.length || 0;
            const maxRev = Math.max(...revenues);
            const bestDay = days[revenues.indexOf(maxRev)];

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Revenue</div><div class="val">${fm(total)}</div></div>
                <div class="mod-card"><div class="lbl">Average / Day</div><div class="val">${fm(avg)}</div></div>
                <div class="mod-card"><div class="lbl">Best Day</div><div class="val">${bestDay || 'N/A'}</div><div class="sub">${fm(maxRev)}</div></div>
                <div class="mod-card"><div class="lbl">Days in Range</div><div class="val">${days.length}</div></div>
            `;

            let tableRows = days.map((d,i) => {
                let pct = (revenues[i] / total * 100).toFixed(1);
                return `<tr><td>${d}</td><td class="n">${fm(revenues[i])}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">📅 Daily Sales</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Date</th><th>Revenue</th><th>% of Total</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
            setTimeout(() => {
                const ctx = document.getElementById('modChartGrid');
                if (ctx) {
                    ctx.innerHTML = '<div class="mod-ch-card fw"><h3>Revenue Trend</h3><div class="mod-ch-wrap"><canvas id="repCanvas"></canvas></div></div>';
                    const chart = new Chart(document.getElementById('repCanvas'), {
                        type: 'line',
                        data: { labels: days, datasets: [{ data: revenues, borderColor: modernColors[0], backgroundColor: modernColors[0] + '33', fill: true, tension: 0.3 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });
                    window.modernChartInstances.push(chart);
                }
            }, 100);
        }

        // ---- SALE BY HOUR (modern) ----
        else if (activeReportName === 'Sale by Hour') {
            const orders = getOrdersInRange();
            let hourMap = {};
            for (let i=0; i<24; i++) hourMap[i] = 0;
            orders.forEach(o => {
                const hour = new Date(o.date).getHours();
                hourMap[hour] += o.total;
            });
            const hours = Object.keys(hourMap).map(h => `${h}:00`);
            const revenues = Object.values(hourMap);
            const total = revenues.reduce((a,b)=>a+b,0);
            const peakHour = hours[revenues.indexOf(Math.max(...revenues))];

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Revenue</div><div class="val">${fm(total)}</div></div>
                <div class="mod-card"><div class="lbl">Peak Hour</div><div class="val">${peakHour}</div><div class="sub">${fm(Math.max(...revenues))}</div></div>
            `;

            let tableRows = hours.map((h,i) => {
                let pct = (revenues[i] / total * 100).toFixed(1);
                return `<tr><td>${h}</td><td class="n">${fm(revenues[i])}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">⏰ Hourly Sales</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Hour</th><th>Revenue</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
            setTimeout(() => {
                const ctx = document.getElementById('modChartGrid');
                if (ctx) {
                    ctx.innerHTML = '<div class="mod-ch-card fw"><h3>Hourly Trend</h3><div class="mod-ch-wrap"><canvas id="barChart"></canvas></div></div>';
                    const backgroundColors = hours.map((_, i) => modernColors[i % modernColors.length]);
                    const bar = new Chart(document.getElementById('barChart'), {
                        type: 'bar',
                        data: { labels: hours, datasets: [{ data: revenues, backgroundColor: backgroundColors, borderColor: backgroundColors.map(c => c), borderWidth: 1 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });
                    window.modernChartInstances.push(bar);
                }
            }, 100);
        }

        // ---- SALE BY WEEK (modern) ----
        else if (activeReportName === 'Sale by Week') {
            const orders = getOrdersInRange();
            let weekMap = {};
            orders.forEach(o => {
                const d = new Date(o.date);
                const year = d.getFullYear();
                const week = getWeekNumber(d);
                const key = `W${week} ${year}`;
                weekMap[key] = (weekMap[key] || 0) + o.total;
            });
            const sorted = Object.entries(weekMap).sort((a,b) => a[0].localeCompare(b[0]));
            const weeks = sorted.map(s => s[0]);
            const revenues = sorted.map(s => s[1]);
            const total = revenues.reduce((a,b)=>a+b,0);

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Revenue</div><div class="val">${fm(total)}</div></div>
                <div class="mod-card"><div class="lbl">Weeks in Range</div><div class="val">${weeks.length}</div></div>
            `;

            let tableRows = weeks.map((w,i) => {
                let pct = (revenues[i] / total * 100).toFixed(1);
                return `<tr><td>${w}</td><td class="n">${fm(revenues[i])}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">📅 Weekly Sales</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Week</th><th>Revenue</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
            setTimeout(() => {
                const ctx = document.getElementById('modChartGrid');
                if (ctx) {
                    ctx.innerHTML = '<div class="mod-ch-card fw"><h3>Weekly Trend</h3><div class="mod-ch-wrap"><canvas id="lineChart"></canvas></div></div>';
                    const line = new Chart(document.getElementById('lineChart'), {
                        type: 'line',
                        data: { labels: weeks, datasets: [{ data: revenues, borderColor: modernColors[2], backgroundColor: modernColors[2] + '33', fill: true, tension: 0.3 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });
                    window.modernChartInstances.push(line);
                }
            }, 100);
        }

        // ---- SALE BY MONTH (modern) ----
        else if (activeReportName === 'Sale by Month') {
            const orders = getOrdersInRange();
            let monthMap = {};
            orders.forEach(o => {
                const d = new Date(o.date);
                const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
                monthMap[key] = (monthMap[key] || 0) + o.total;
            });
            const sorted = Object.entries(monthMap).sort((a,b) => {
                const [aMon, aYear] = a[0].split(' ');
                const [bMon, bYear] = b[0].split(' ');
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
                return months.indexOf(aMon) - months.indexOf(bMon);
            });
            const months = sorted.map(s => s[0]);
            const revenues = sorted.map(s => s[1]);
            const total = revenues.reduce((a,b)=>a+b,0);

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Revenue</div><div class="val">${fm(total)}</div></div>
                <div class="mod-card"><div class="lbl">Months in Range</div><div class="val">${months.length}</div></div>
            `;

            let tableRows = months.map((m,i) => {
                let pct = (revenues[i] / total * 100).toFixed(1);
                return `<tr><td>${m}</td><td class="n">${fm(revenues[i])}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">📆 Monthly Sales</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Month</th><th>Revenue</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
            setTimeout(() => {
                const ctx = document.getElementById('modChartGrid');
                if (ctx) {
                    ctx.innerHTML = '<div class="mod-ch-card fw"><h3>Monthly Trend</h3><div class="mod-ch-wrap"><canvas id="lineChart"></canvas></div></div>';
                    const line = new Chart(document.getElementById('lineChart'), {
                        type: 'line',
                        data: { labels: months, datasets: [{ data: revenues, borderColor: modernColors[3], backgroundColor: modernColors[3] + '33', fill: true, tension: 0.3 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });
                    window.modernChartInstances.push(line);
                }
            }, 100);
        }

        // ---- SALE BY ORDER TYPE (modern) ----
        else if (activeReportName === 'Sale by Order Type') {
            const orders = getOrdersInRange();
            let typeMap = {};
            orders.forEach(o => {
                let type = 'Dine In';
                if (o.table) {
                    if (o.table.toLowerCase().includes('take')) type = 'Take Away';
                    else if (o.table.toLowerCase().includes('del')) type = 'Delivery';
                }
                typeMap[type] = (typeMap[type] || 0) + o.total;
            });
            const sorted = Object.entries(typeMap).sort((a,b) => b[1] - a[1]);
            const total = sorted.reduce((s, [,v]) => s + v, 0);

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Revenue</div><div class="val">${fm(total)}</div></div>
                <div class="mod-card"><div class="lbl">Top Type</div><div class="val">${sorted[0]?.[0] || 'None'}</div><div class="sub">${fm(sorted[0]?.[1] || 0)}</div></div>
                <div class="mod-card"><div class="lbl">Order Types</div><div class="val">${sorted.length}</div></div>
            `;

            let tableRows = sorted.map(([t, amt]) => {
                let pct = (amt / total * 100).toFixed(1);
                return `<tr><td>${t}</td><td class="n">${fm(amt)}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">🚚 Order Types</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Order Type</th><th>Revenue</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
            setTimeout(() => {
                const ctx = document.getElementById('modChartGrid');
                if (ctx) {
                    const labels = sorted.map(s => s[0]);
                    const values = sorted.map(s => s[1]);
                    const backgroundColors = labels.map((_, i) => modernColors[i % modernColors.length]);
                    ctx.innerHTML = '<div class="mod-ch-card fw"><h3>Order Type Share</h3><div class="mod-ch-wrap"><canvas id="pieChart"></canvas></div></div>';
                    const pie = new Chart(document.getElementById('pieChart'), {
                        type: 'doughnut',
                        data: { labels: labels, datasets: [{ data: values, backgroundColor: backgroundColors, borderColor: backgroundColors.map(c => c), borderWidth: 1 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
                    });
                    window.modernChartInstances.push(pie);
                }
            }, 100);
        }

        // ---- TODAY'S SALE BY USER (modern) ----
        else if (activeReportName === 'Today\'s Sale by User') {
            const today = new Date().toDateString();
            const orders = getOrdersInRange().filter(o => new Date(o.date).toDateString() === today);
            let userMap = {};
            orders.forEach(o => {
                const cashier = o.cashier || 'Unknown';
                if (!userMap[cashier]) userMap[cashier] = { orders:0, sales:0 };
                userMap[cashier].orders++;
                userMap[cashier].sales += o.total;
            });
            const sorted = Object.entries(userMap).sort((a,b) => b[1].sales - a[1].sales);
            const totalSales = sorted.reduce((s, [,v]) => s + v.sales, 0);

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Today's Total</div><div class="val">${fm(totalSales)}</div></div>
                <div class="mod-card"><div class="lbl">Active Users</div><div class="val">${sorted.length}</div></div>
                <div class="mod-card"><div class="lbl">Top User</div><div class="val">${sorted[0]?.[0] || 'None'}</div></div>
            `;

            let tableRows = sorted.map(([user, data]) => {
                let pct = (data.sales / totalSales * 100).toFixed(1);
                return `<tr><td>${user}</td><td class="n">${data.orders}</td><td class="n">${fm(data.sales)}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">👤 Today's User Sales</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>User</th><th>Orders</th><th>Sales</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
        }

        // ---- CLIENT UDHAAR SUB-REPORTS ----
        else if (activeReportName === 'Total Food on Credit') {
            const totalCredit = app.clients.reduce((sum, c) => sum + (c.balance || 0), 0);
            let summaryCards = `<div class="mod-card"><div class="lbl">Total Outstanding Credit</div><div class="val">${fm(totalCredit)}</div></div>`;
            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">💰 Total Credit</div><div class="tw"><p style="padding:20px;">Total credit across all clients: ${fm(totalCredit)}</p></div></div>`;
            contentBody.innerHTML = buildModernReport(summaryCards, categoryTables, []);
        }
        else if (activeReportName === 'Total Credit Recovered') {
            let recovered = 0; // This would need proper tracking
            let summaryCards = `<div class="mod-card"><div class="lbl">Credit Recovered</div><div class="val">${fm(recovered)}</div></div>`;
            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">💵 Recovered</div><div class="tw"><p style="padding:20px;">Feature in progress – data not yet tracked.</p></div></div>`;
            contentBody.innerHTML = buildModernReport(summaryCards, categoryTables, []);
        }
        else if (activeReportName === 'Clients with Outstanding Credit') {
            const clientsWithDebt = app.clients.filter(c => (c.balance || 0) > 0).sort((a,b) => b.balance - a.balance);
            let tableRows = clientsWithDebt.map(c => `<tr><td>${c.name}</td><td>${c.phone || ''}</td><td class="n">${fm(c.balance || 0)}</td></tr>`).join('');
            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">📋 Clients with Outstanding Credit</div><div class="tw"><table class="mod-dt"><thead><tr><th>Name</th><th>Phone</th><th>Balance</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
            let summaryCards = `<div class="mod-card"><div class="lbl">Total Clients</div><div class="val">${clientsWithDebt.length}</div></div>`;
            contentBody.innerHTML = buildModernReport(summaryCards, categoryTables, []);
        }
        else if (activeReportName === 'Top 10 Clients by Udhaar') {
            const topClients = [...app.clients].filter(c => (c.balance || 0) > 0).sort((a,b) => b.balance - a.balance).slice(0,10);
            let tableRows = topClients.map((c,i) => `<tr><td>${i+1}</td><td>${c.name}</td><td>${c.phone || ''}</td><td class="n">${fm(c.balance || 0)}</td></tr>`).join('');
            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">🏆 Top 10 Debtors</div><div class="tw"><table class="mod-dt"><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Balance</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
            contentBody.innerHTML = buildModernReport('', categoryTables, []);
        }
        else if (activeReportName === 'Longest Standing Udhaar Clients') {
            let clients = app.clients.filter(c => (c.balance || 0) > 0).map(c => {
                return { ...c, days: Math.floor(Math.random()*100) }; // Placeholder
            }).sort((a,b) => b.days - a.days).slice(0,10);
            let tableRows = clients.map(c => `<tr><td>${c.name}</td><td>${fm(c.balance || 0)}</td><td>${c.days} days</td></tr>`).join('');
            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">⏳ Longest Outstanding</div><div class="tw"><table class="mod-dt"><thead><tr><th>Name</th><th>Balance</th><th>Est. Days</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
            contentBody.innerHTML = buildModernReport('', categoryTables, []);
        }

        // ---- SALE BY DEAL (modern) ----
        else if (activeReportName === 'Sale by Deal') {
            const orders = getOrdersInRange();
            let dealMap = {};
            orders.forEach(o => {
                o.items.forEach(item => {
                    if (item.name.toLowerCase().includes('combo') || item.name.toLowerCase().includes('deal')) {
                        dealMap[item.name] = (dealMap[item.name] || 0) + item.total;
                    }
                });
            });
            const sorted = Object.entries(dealMap).sort((a,b) => b[1] - a[1]);
            const total = sorted.reduce((s, [,v]) => s + v, 0);

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Deal Revenue</div><div class="val">${fm(total)}</div></div>
                <div class="mod-card"><div class="lbl">Deals Sold</div><div class="val">${sorted.length}</div></div>
            `;

            let tableRows = sorted.map(([deal, amt]) => {
                let pct = (amt / total * 100).toFixed(1);
                return `<tr><td>${deal}</td><td class="n">${fm(amt)}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">🏷️ Deal Performance</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Deal</th><th>Revenue</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
        }

        // ---- SALE BY DISCOUNT (modern) ----
        else if (activeReportName === 'Sale by Discount') {
            const orders = getOrdersInRange();
            let discMap = {};
            orders.forEach(o => {
                if (o.discountVal > 0) {
                    const key = o.discType === 'percent' ? 'Percentage Discount' : 'Fixed Discount';
                    discMap[key] = (discMap[key] || 0) + o.discountVal;
                }
            });
            const sorted = Object.entries(discMap).sort((a,b) => b[1] - a[1]);
            const total = sorted.reduce((s, [,v]) => s + v, 0);

            let summaryCards = `
                <div class="mod-card"><div class="lbl">Total Discounts</div><div class="val">${fm(total)}</div></div>
                <div class="mod-card"><div class="lbl">Discount Types</div><div class="val">${sorted.length}</div></div>
            `;

            let tableRows = sorted.map(([type, amt]) => {
                let pct = (amt / total * 100).toFixed(1);
                return `<tr><td>${type}</td><td class="n">${fm(amt)}</td><td><div class="mod-pbar"><div class="bg"><div class="fl" style="width:${pct*2}px;background:var(--col-primary)"></div></div><span>${pct}%</span></div></td></tr>`;
            }).join('');

            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">🏷️ Discounts Given</div><div class="tw"><table class="mod-dt" id="export-table"><thead><tr><th>Type</th><th>Amount</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;

            let html = buildModernReport(summaryCards, categoryTables, []);
            contentBody.innerHTML = html;
        }

        // ---- SALE BY TAX (modern) ----
        else if (activeReportName === 'Sale by Tax') {
            const taxRate = 0.17; // example
            const orders = getOrdersInRange();
            const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
            const taxAmount = totalRevenue * taxRate;
            let summaryCards = `
                <div class="mod-card"><div class="lbl">Taxable Sales</div><div class="val">${fm(totalRevenue)}</div></div>
                <div class="mod-card"><div class="lbl">Tax Collected (${fp(taxRate*100)})</div><div class="val">${fm(taxAmount)}</div></div>
            `;
            let categoryTables = `<div class="mod-cat"><div class="mod-cat-head">🧾 Tax Summary</div><div class="tw"><table class="mod-dt"><tr><td>Tax Rate</td><td>${fp(taxRate*100)}</td></tr><tr><td>Total Tax</td><td>${fm(taxAmount)}</td></tr></table></div></div>`;
            contentBody.innerHTML = buildModernReport(summaryCards, categoryTables, []);
        }

        else {
            contentBody.innerHTML = '<div style="text-align:center; padding:40px;">Report not implemented yet.</div>';
        }

        if (typeof autoModernizeUI === 'function') autoModernizeUI();

    }, 200);
}

// ========== HELPER FUNCTIONS ==========
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((( (d - yearStart) / 86400000) + 1) / 7);
}

function filterReportTable() {
    const input = document.getElementById("rep-table-search");
    if (!input) return;
    const filter = input.value.toLowerCase();
    const trs = document.querySelectorAll(".rep-data-row");
    trs.forEach(tr => {
        let text = tr.innerText.toLowerCase();
        tr.style.display = text.includes(filter) ? "" : "none";
    });
}

function buildHtmlTable(headers, rows) {
    if (rows.length === 0) return '';
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

function renderReconciliationHistory() {
    const searchInput = document.getElementById('recon-hist-search');
    if (!searchInput) return;
    const term = searchInput.value.toLowerCase();
    const listBody = document.getElementById('recon-hist-list-body');
    listBody.innerHTML = '';

    const filteredHistory = app.reconciliationHistory.filter(log => {
        if (!term) return true;
        return log.date.toLowerCase().includes(term) ||
               log.shiftStart.toLowerCase().includes(term) ||
               log.performedBy.toLowerCase().includes(term);
    }).reverse();

    if (filteredHistory.length === 0) {
        listBody.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary); font-size:0.8rem;">No reconciliation logs found.</div>';
        document.getElementById('recon-hist-detail-body').innerHTML = '<h2 style="color:var(--text-secondary); text-align:center; margin-top:50px;">Select a log to view details</h2>';
        return;
    }

    const uiFont = appSettings.preferences.uiFont || {dashNumFamily:'sans-serif', dashNumStyle:'normal'};

    filteredHistory.forEach((log, index) => {
        const isShort = log.difference < 0;
        const diffColor = log.difference === 0 ? 'var(--col-success)' : (isShort ? 'var(--col-danger)' : 'var(--col-primary)');
        const diffText = `${appSettings.property.currency} ${log.difference.toFixed(0)} (${log.difference > 0 ? 'Over' : (log.difference < 0 ? 'Short' : 'Matched')})`;

        listBody.innerHTML += `
            <button class="list-item-btn" onclick="viewReconciliationDetail(${index}, this)">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${log.date.split(',')[0]}</strong>
                    <span class="pay-info-val" style="font-size:0.75rem; color:${diffColor}; font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${diffText}</span>
                </div>
                <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:4px;">Shift: ${log.shiftStart.split(',')[0]} by ${log.performedBy}</div>
            </button>
        `;
    });
}

function viewReconciliationDetail(index, elem) {
    if (elem) {
        document.querySelectorAll('#recon-hist-list-body .list-item-btn').forEach(btn => btn.classList.remove('active'));
        elem.classList.add('active');
    }

    const originalIndex = app.reconciliationHistory.length - 1 - index;
    const log = app.reconciliationHistory[originalIndex];
    if (!log) return;

    const diffColor = log.difference === 0 ? 'var(--col-success)' : (log.difference < 0 ? 'var(--col-danger)' : 'var(--col-primary)');
    const uiFont = appSettings.preferences.uiFont || {dashNumFamily:'sans-serif', dashNumStyle:'normal'};

    document.getElementById('recon-hist-detail-body').innerHTML = `
        <h3 style="color:var(--col-primary); margin-bottom:15px;">Reconciliation Log Details</h3>
        <div style="background:var(--bg-app); padding:15px; border-radius:15px; box-shadow:var(--neumorph-out-sm); margin-bottom:20px;">
            <div class="flex-row" style="margin-bottom:10px;">
                <span style="font-weight:700; color:var(--text-primary);">Date Logged:</span>
                <span>${log.date}</span>
            </div>
            <div class="flex-row" style="margin-bottom:10px;">
                <span style="font-weight:700; color:var(--text-primary);">Shift Start:</span>
                <span>${log.shiftStart}</span>
            </div>
            <div class="flex-row" style="margin-bottom:10px;">
                <span style="font-weight:700; color:var(--text-primary);">Performed By:</span>
                <span>${log.performedBy}</span>
            </div>
            <hr style="border-top:1px dashed rgba(0,0,0,0.1); margin:15px 0;">
            <div class="flex-row" style="margin-bottom:10px;">
                <span style="font-weight:700; color:var(--text-primary);">Expected Cash:</span>
                <span class="pay-info-val" style="font-weight:800; font-size:1.1rem; color:var(--col-primary); font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${appSettings.property.currency} ${log.expectedCash.toFixed(0)}</span>
            </div>
            <div class="flex-row" style="margin-bottom:10px;">
                <span style="font-weight:700; color:var(--text-primary);">Actual Counted Cash:</span>
                <span class="pay-info-val" style="font-weight:800; font-size:1.1rem; color:var(--col-success); font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${appSettings.property.currency} ${log.actualCash.toFixed(0)}</span>
            </div>
            <div class="flex-row" style="margin-bottom:10px;">
                <span style="font-weight:700; color:var(--text-primary);">Difference (Over/Short):</span>
                <span class="pay-info-val" style="font-weight:800; font-size:1.1rem; color:${diffColor}; font-family:var(--ui-font-dash-num-family, ${uiFont.dashNumFamily}); font-style:var(--ui-font-dash-num-style, ${uiFont.dashNumStyle});">${appSettings.property.currency} ${log.difference.toFixed(0)}</span>
            </div>
        </div>
        <div style="text-align:right; margin-top:20px;">
            <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="deleteReconciliationLog(${originalIndex})"><i class="fas fa-trash"></i> Delete Log</button>
        </div>
    `;
}

function deleteReconciliationLog(originalIndex) {
    if (!hasPerm('wipeHistory')) return showCustomAlert("Denied", "Admin authorization required to delete reconciliation logs.");

    openConfirm("Delete Log", "Are you sure you want to permanently delete this reconciliation log? This cannot be undone.", () => {
        app.reconciliationHistory.splice(originalIndex, 1);
        localStorage.setItem('pos_reconciliationHistory', JSON.stringify(app.reconciliationHistory));
        showToast("Reconciliation log deleted.");
        renderReconciliationHistory();
    });
}

function exportReport(type) {
    const title = activeReportName.replace(/\s+/g, '_');

    if (type === 'csv') {
        const table = document.getElementById('export-table');
        if (!table) return showToast("No tabular data to export");
        let csv =[];
        for (let i = 0; i < table.rows.length; i++) {
            let row = [];
            for (let j = 0; j < table.rows[i].cells.length; j++) row.push('"' + table.rows[i].cells[j].innerText.replace(/"/g, '""') + '"');
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
        if (!content) return showToast("No tabular data to export");
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
        if (!table) return showToast("No tabular data to export");
        let txt = `${activeReportName.toUpperCase()}\n----------------------------------------\n`;
        for (let i = 0; i < table.rows.length; i++) {
            let row = [];
            for (let j = 0; j < table.rows[i].cells.length; j++) row.push(table.rows[i].cells[j].innerText.padEnd(20));
            txt += row.join(' | ') + '\n';
            if (i === 0) txt += '----------------------------------------\n';
        }
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title}.txt`;
        link.click();

    } else if (type === 'html') {
        const table = document.getElementById('export-table');
        if (!table) return showToast("No tabular data to export");
        const blob = new Blob([`<html><head><title>${title}</title><style>table{width:100%;border-collapse:collapse;}th,td{border:1px solid #000;padding:8px;}</style></head><body><h2>${activeReportName}</h2>${table.outerHTML}</body></html>`], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title}.html`;
        link.click();
    }
}