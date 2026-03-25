// inventory_logic.js
// Complete business logic for inventory management
// Version: 2.0 - Fully integrated with all features

// ============================================================================
// INITIALIZATION & DEPENDENCY CHECK
// ============================================================================
(function() {
    // Ensure inventory_data.js functions are available
    if (typeof inv_getIngredients === 'undefined') {
        console.error('inventory_data.js must be loaded before inventory_logic.js');
        return;
    }
})();

// ============================================================================
// STOCK DEDUCTION ON SALE
// ============================================================================
function deductStockForOrder(orderItems) {
    if (!orderItems || orderItems.length === 0) {
        console.log('No items to deduct stock for');
        return true;
    }
    
    const results = {
        success: true,
        deductions: [],
        errors: []
    };
    
    for (const item of orderItems) {
        // Skip deal items - they have children that will be processed separately
        if (item.type === 'deal' && item.children) {
            for (const child of item.children) {
                const childResult = deductStockForSingleItem(child, item.qty || 1);
                if (!childResult.success) {
                    results.success = false;
                    results.errors.push(...childResult.errors);
                } else if (childResult.deductions) {
                    results.deductions.push(...childResult.deductions);
                }
            }
            continue;
        }
        
        const itemResult = deductStockForSingleItem(item, item.qty || 1);
        if (!itemResult.success) {
            results.success = false;
            results.errors.push(...itemResult.errors);
        } else if (itemResult.deductions) {
            results.deductions.push(...itemResult.deductions);
        }
    }
    
    if (!results.success) {
        const errorMsg = results.errors.join('\n');
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Stock Deduction Failed', errorMsg);
        } else {
            console.error('Stock deduction failed:', errorMsg);
        }
        return false;
    }
    
    if (results.deductions.length > 0 && typeof showToast === 'function') {
        showToast(`Stock deducted: ${results.deductions.length} ingredients updated`, 'success');
    }
    
    return true;
}

function deductStockForSingleItem(item, multiplier = 1) {
    const result = {
        success: true,
        deductions: [],
        errors: []
    };
    
    // Get menu item ID - try multiple sources
    let menuItemId = item.id;
    if (!menuItemId && item.menuItemId) menuItemId = item.menuItemId;
    if (!menuItemId) {
        // Try to find by name
        const menuItem = window.menuItems ? window.menuItems.find(m => m.name === item.name) : null;
        if (menuItem) menuItemId = menuItem.id;
    }
    
    if (!menuItemId) {
        result.success = false;
        result.errors.push(`Cannot deduct stock for "${item.name}": No menu item ID found`);
        return result;
    }
    
    // Get recipe for this menu item
    const recipe = inv_getRecipeForMenuItem(menuItemId);
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
        // No recipe defined - skip silently
        return result;
    }
    
    // Deduct each ingredient
    for (const ing of recipe.ingredients) {
        const totalQtyToDeduct = ing.quantity * multiplier;
        
        if (totalQtyToDeduct <= 0) continue;
        
        const beforeQty = inv_getStock(ing.ingredientId);
        
        try {
            inv_adjustStockWithSafety(
                ing.ingredientId,
                -totalQtyToDeduct,
                'SALE',
                `Sale: ${item.name} (x${multiplier}) - Order ID: ${item.orderId || 'N/A'}`,
                inv_getCurrentUser()
            );
            
            result.deductions.push({
                ingredientId: ing.ingredientId,
                ingredientName: inv_getIngredientById(ing.ingredientId)?.name || 'Unknown',
                deducted: totalQtyToDeduct,
                before: beforeQty,
                after: inv_getStock(ing.ingredientId)
            });
        } catch (error) {
            result.success = false;
            result.errors.push(error.message);
        }
    }
    
    return result;
}

// ============================================================================
// VARIANCE CALCULATION ENGINE
// ============================================================================
function calculateVariance(ingredientId, expectedQty, physicalQty) {
    const variance = physicalQty - expectedQty;
    let variancePct = 0;
    
    if (expectedQty > 0) {
        variancePct = (variance / expectedQty) * 100;
    } else if (physicalQty > 0) {
        variancePct = 100;
    }
    
    const settings = (typeof appSettings !== 'undefined' && appSettings.inventory) ? appSettings.inventory : { 
        varianceWarningPct: 3, 
        varianceCriticalPct: 10 
    };
    
    let severity = 'OK';
    let message = '';
    
    if (Math.abs(variancePct) > settings.varianceCriticalPct) {
        severity = 'CRITICAL';
        message = `Critical variance detected: ${variancePct.toFixed(2)}% (${variance > 0 ? 'Over' : 'Short'} by ${Math.abs(variance).toFixed(2)})`;
        if (typeof showToast === 'function') {
            showToast(message, 'danger');
        }
    } else if (Math.abs(variancePct) > settings.varianceWarningPct) {
        severity = 'WARNING';
        message = `Variance warning: ${variancePct.toFixed(2)}% (${variance > 0 ? 'Over' : 'Short'} by ${Math.abs(variance).toFixed(2)})`;
        if (typeof showToast === 'function') {
            showToast(message, 'warning');
        }
    }
    
    if (message) {
        inv_logAudit('VARIANCE_DETECTED', 'ingredient', ingredientId, message);
    }
    
    return {
        variance: variance,
        variancePct: variancePct,
        severity: severity,
        message: message
    };
}

// ============================================================================
// THEORETICAL CONSUMPTION CALCULATION
// ============================================================================
function getTheoreticalConsumption(ingredientId, startDate, endDate) {
    const movements = inv_getMovements();
    const filtered = movements.filter(m => 
        m.ingredientId === ingredientId &&
        m.type === 'SALE' &&
        new Date(m.timestamp) >= startDate &&
        new Date(m.timestamp) <= endDate
    );
    
    const totalConsumed = filtered.reduce((sum, m) => sum + Math.abs(m.delta), 0);
    return totalConsumed;
}

function getConsumptionByPeriod(ingredientId, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const consumption = getTheoreticalConsumption(ingredientId, startDate, endDate);
    const avgDailyConsumption = consumption / days;
    
    return {
        total: consumption,
        avgDaily: avgDailyConsumption,
        periodDays: days,
        startDate: startDate,
        endDate: endDate
    };
}

// ============================================================================
// PRICE ANOMALY DETECTION
// ============================================================================
function inv_isPriceAnomalous(supplierId, ingredientId, newPrice) {
    const supplier = inv_getSupplierById(supplierId);
    if (!supplier || !supplier.priceHistory || !supplier.priceHistory[ingredientId]) {
        return false;
    }
    
    const history = supplier.priceHistory[ingredientId];
    if (history.length < 2) return false;
    
    const recentPrices = history.slice(0, Math.min(5, history.length));
    const avgPrice = recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;
    
    const settings = (typeof appSettings !== 'undefined' && appSettings.inventory) ? appSettings.inventory : { priceAnomalyPct: 10 };
    const threshold = settings.priceAnomalyPct || 10;
    
    const diffPct = Math.abs((newPrice - avgPrice) / avgPrice) * 100;
    const isAnomalous = diffPct > threshold;
    
    if (isAnomalous && typeof showToast === 'function') {
        showToast(`⚠️ Price anomaly: ${newPrice} vs avg ${avgPrice.toFixed(2)} (${diffPct.toFixed(1)}% difference)`, 'warning');
    }
    
    return {
        isAnomalous: isAnomalous,
        avgPrice: avgPrice,
        diffPct: diffPct,
        threshold: threshold
    };
}

// ============================================================================
// PREDICTIVE REORDER SUGGESTIONS
// ============================================================================
function inv_getReorderSuggestions() {
    const ingredients = inv_getIngredients().filter(i => !i.archived);
    const suggestions = [];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const ingredient of ingredients) {
        const currentStock = inv_getStock(ingredient.id);
        const consumptionData = getConsumptionByPeriod(ingredient.id, 30);
        const avgDailyConsumption = consumptionData.avgDaily;
        
        let daysRemaining = Infinity;
        if (avgDailyConsumption > 0) {
            daysRemaining = currentStock / avgDailyConsumption;
        }
        
        const needsReorder = currentStock <= ingredient.minThreshold || (daysRemaining <= 7 && daysRemaining > 0);
        
        if (needsReorder) {
            const suggestedQty = Math.max(ingredient.minThreshold * 2, Math.ceil(avgDailyConsumption * 14));
            
            let urgency = 'normal';
            if (currentStock === 0) urgency = 'critical';
            else if (daysRemaining <= 3) urgency = 'high';
            else if (daysRemaining <= 7) urgency = 'medium';
            
            suggestions.push({
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                currentStock: currentStock,
                minThreshold: ingredient.minThreshold,
                avgDailyConsumption: parseFloat(avgDailyConsumption.toFixed(2)),
                daysRemaining: daysRemaining === Infinity ? 'Unlimited' : parseFloat(daysRemaining.toFixed(1)),
                suggestedQty: suggestedQty,
                unit: ingredient.unit,
                urgency: urgency,
                costPerUnit: ingredient.costPerUnit,
                estimatedCost: suggestedQty * (ingredient.costPerUnit || 0)
            });
        }
    }
    
    suggestions.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, normal: 3 };
        const aUrgency = a.daysRemaining === 'Unlimited' ? 4 : urgencyOrder[a.urgency];
        const bUrgency = b.daysRemaining === 'Unlimited' ? 4 : urgencyOrder[b.urgency];
        return aUrgency - bUrgency;
    });
    
    return suggestions;
}

// ============================================================================
// STOCK LEVEL CHECKERS
// ============================================================================
function inv_checkAllStockLevels() {
    const ingredients = inv_getIngredients().filter(i => !i.archived);
    const alerts = [];
    
    for (const ingredient of ingredients) {
        const currentQty = inv_getStock(ingredient.id);
        
        if (currentQty <= 0) {
            alerts.push({
                type: 'critical',
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                currentQty: currentQty,
                threshold: ingredient.minThreshold,
                message: `${ingredient.name} is OUT OF STOCK!`
            });
            inv_triggerOutOfStockAlert(ingredient.id, ingredient.name);
        } else if (currentQty <= ingredient.minThreshold) {
            alerts.push({
                type: 'warning',
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                currentQty: currentQty,
                threshold: ingredient.minThreshold,
                message: `${ingredient.name} is low on stock (${currentQty} ${ingredient.unit} remaining)`
            });
            inv_triggerLowStockAlert(ingredient.id, ingredient.name, currentQty, ingredient.minThreshold);
        }
    }
    
    return alerts;
}

function inv_getStockStatus(ingredientId) {
    const ingredient = inv_getIngredientById(ingredientId);
    if (!ingredient) return 'unknown';
    
    const currentQty = inv_getStock(ingredientId);
    
    if (currentQty <= 0) return 'critical';
    if (currentQty <= ingredient.minThreshold) return 'low';
    return 'ok';
}

function inv_getStockStatusColor(status) {
    switch (status) {
        case 'critical': return 'var(--col-danger)';
        case 'low': return '#e67e22';
        case 'ok': return 'var(--col-success)';
        default: return 'var(--text-secondary)';
    }
}

// ============================================================================
// COST CALCULATIONS
// ============================================================================
function inv_calculateRecipeCost(menuItemId) {
    const recipe = inv_getRecipeForMenuItem(menuItemId);
    if (!recipe || !recipe.ingredients) return 0;
    
    let totalCost = 0;
    for (const ing of recipe.ingredients) {
        const ingredient = inv_getIngredientById(ing.ingredientId);
        if (ingredient) {
            totalCost += ing.quantity * (ingredient.costPerUnit || 0);
        }
    }
    
    return totalCost;
}

function inv_calculatePotentialProfit(menuItemId, sellingPrice) {
    const cost = inv_calculateRecipeCost(menuItemId);
    return sellingPrice - cost;
}

function inv_calculateGrossProfitMargin(menuItemId, sellingPrice) {
    const cost = inv_calculateRecipeCost(menuItemId);
    if (sellingPrice <= 0) return 0;
    return ((sellingPrice - cost) / sellingPrice) * 100;
}

// ============================================================================
// BATCH TRACKING HELPERS
// ============================================================================
function inv_createBatch(ingredientId, qty, supplierId, expiryDate) {
    const batchId = inv_generateId('BATCH');
    const batches = inv_getBatches();
    
    const newBatch = {
        id: batchId,
        ingredientId: ingredientId,
        supplierId: supplierId,
        qty: parseFloat(qty),
        remainingQty: parseFloat(qty),
        expiryDate: expiryDate || null,
        createdAt: new Date().toISOString(),
        createdBy: inv_getCurrentUser(),
        status: 'active'
    };
    
    batches.unshift(newBatch);
    inv_saveBatches(batches);
    inv_logAudit('CREATE_BATCH', 'batch', batchId, `Created batch for ${ingredientId}: ${qty}`);
    return newBatch;
}

function inv_getBatches() {
    try {
        const data = localStorage.getItem('inv_batches');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function inv_saveBatches(batches) {
    localStorage.setItem('inv_batches', JSON.stringify(batches));
}

function inv_consumeFromBatch(ingredientId, qty, orderId) {
    const batches = inv_getBatches();
    const activeBatches = batches.filter(b => 
        b.ingredientId === ingredientId && 
        b.status === 'active' && 
        b.remainingQty > 0
    ).sort((a, b) => {
        if (a.expiryDate && b.expiryDate) {
            return new Date(a.expiryDate) - new Date(b.expiryDate);
        }
        if (a.expiryDate) return -1;
        if (b.expiryDate) return 1;
        return 0;
    });
    
    let remainingToConsume = qty;
    const consumptionLog = [];
    
    for (const batch of activeBatches) {
        if (remainingToConsume <= 0) break;
        
        const consumeFromBatch = Math.min(batch.remainingQty, remainingToConsume);
        batch.remainingQty -= consumeFromBatch;
        remainingToConsume -= consumeFromBatch;
        
        consumptionLog.push({
            batchId: batch.id,
            consumed: consumeFromBatch,
            remaining: batch.remainingQty
        });
        
        if (batch.remainingQty === 0) {
            batch.status = 'exhausted';
            batch.exhaustedAt = new Date().toISOString();
        }
    }
    
    inv_saveBatches(batches);
    
    if (remainingToConsume > 0) {
        inv_logAudit('BATCH_SHORTAGE', 'ingredient', ingredientId, `Order ${orderId} required ${qty} but only ${qty - remainingToConsume} available from batches`);
    }
    
    return {
        consumed: qty - remainingToConsume,
        shortfall: remainingToConsume,
        consumptionLog: consumptionLog
    };
}

// ============================================================================
// SHIFT RECONCILIATION
// ============================================================================
function inv_getShiftVariance(shiftStart, shiftEnd) {
    const movements = inv_getMovements();
    const shiftMovements = movements.filter(m => 
        new Date(m.timestamp) >= shiftStart && 
        new Date(m.timestamp) <= shiftEnd
    );
    
    const summary = {
        startTime: shiftStart,
        endTime: shiftEnd,
        sales: [],
        purchases: [],
        wastage: [],
        adjustments: [],
        totalSalesValue: 0,
        totalPurchaseValue: 0,
        totalWastageValue: 0,
        netStockChange: 0
    };
    
    for (const movement of shiftMovements) {
        const ingredient = inv_getIngredientById(movement.ingredientId);
        const value = Math.abs(movement.delta) * (ingredient?.costPerUnit || 0);
        
        switch (movement.type) {
            case 'SALE':
                summary.sales.push(movement);
                summary.totalSalesValue += value;
                break;
            case 'PURCHASE':
                summary.purchases.push(movement);
                summary.totalPurchaseValue += value;
                break;
            case 'WASTAGE':
                summary.wastage.push(movement);
                summary.totalWastageValue += value;
                break;
            default:
                summary.adjustments.push(movement);
                break;
        }
        
        summary.netStockChange += movement.delta;
    }
    
    return summary;
}

// ============================================================================
// AUTO-REORDER ENGINE
// ============================================================================
function inv_checkAutoReorder() {
    const suggestions = inv_getReorderSuggestions();
    const urgentItems = suggestions.filter(s => s.urgency === 'critical' || s.urgency === 'high');
    
    if (urgentItems.length > 0 && typeof showToast === 'function') {
        showToast(`⚠️ ${urgentItems.length} items need immediate reordering`, 'warning');
    }
    
    const autoReorderSettings = (typeof appSettings !== 'undefined' && appSettings.inventory?.autoReorder) || false;
    
    if (autoReorderSettings) {
        for (const item of urgentItems) {
            if (item.urgency === 'critical') {
                inv_createAutoReorderPurchase(item);
            }
        }
    }
    
    return {
        urgentCount: urgentItems.length,
        suggestions: suggestions,
        autoReordersCreated: autoReorderSettings ? urgentItems.filter(i => i.urgency === 'critical').length : 0
    };
}

function inv_createAutoReorderPurchase(item) {
    const suppliers = inv_getSuppliers().filter(s => !s.archived);
    if (suppliers.length === 0) return null;
    
    const preferredSupplier = suppliers[0];
    
    const purchaseData = {
        supplierId: preferredSupplier.id,
        supplierName: preferredSupplier.name,
        date: new Date().toISOString().split('T')[0],
        invoiceNo: `AUTO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        notes: `Auto-generated reorder for ${item.ingredientName} - Stock critically low`,
        items: [{
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            qty: item.suggestedQty,
            unit: item.unit,
            unitPrice: item.costPerUnit
        }]
    };
    
    const purchaseOrder = inv_createPurchaseOrder(purchaseData);
    inv_logAudit('AUTO_REORDER', 'purchase', purchaseOrder.id, `Auto-created PO for ${item.ingredientName} - ${item.suggestedQty} ${item.unit}`);
    
    if (typeof showToast === 'function') {
        showToast(`Auto-reorder created for ${item.ingredientName}`, 'info');
    }
    
    return purchaseOrder;
}

// ============================================================================
// WASTAGE ANALYSIS
// ============================================================================
function inv_getWastageByCategory(startDate, endDate) {
    const wastage = inv_getWastage();
    const filtered = wastage.filter(w => 
        w.status === 'approved' &&
        new Date(w.approvedAt) >= startDate &&
        new Date(w.approvedAt) <= endDate
    );
    
    const byCategory = {};
    const byReason = {};
    let totalValue = 0;
    
    for (const w of filtered) {
        const ingredient = inv_getIngredientById(w.ingredientId);
        const value = w.qty * (ingredient?.costPerUnit || 0);
        const category = ingredient?.category || 'Unknown';
        
        byCategory[category] = (byCategory[category] || 0) + value;
        byReason[w.reason] = (byReason[w.reason] || 0) + value;
        totalValue += value;
    }
    
    return {
        byCategory: byCategory,
        byReason: byReason,
        totalValue: totalValue,
        totalEntries: filtered.length
    };
}

function inv_getTopWastageItems(limit = 10, startDate, endDate) {
    const wastage = inv_getWastage();
    const filtered = wastage.filter(w => 
        w.status === 'approved' &&
        new Date(w.approvedAt) >= startDate &&
        new Date(w.approvedAt) <= endDate
    );
    
    const itemMap = {};
    
    for (const w of filtered) {
        const ingredient = inv_getIngredientById(w.ingredientId);
        const value = w.qty * (ingredient?.costPerUnit || 0);
        
        if (!itemMap[w.ingredientId]) {
            itemMap[w.ingredientId] = {
                ingredientId: w.ingredientId,
                ingredientName: ingredient?.name || w.ingredientName,
                unit: ingredient?.unit || '',
                totalQty: 0,
                totalValue: 0,
                entries: []
            };
        }
        
        itemMap[w.ingredientId].totalQty += w.qty;
        itemMap[w.ingredientId].totalValue += value;
        itemMap[w.ingredientId].entries.push(w);
    }
    
    const sorted = Object.values(itemMap).sort((a, b) => b.totalValue - a.totalValue);
    return sorted.slice(0, limit);
}

// ============================================================================
// PURCHASE ANALYSIS
// ============================================================================
function inv_getPurchaseTrends(months = 6) {
    const purchases = inv_getPurchases();
    const approved = purchases.filter(p => p.status === 'approved');
    
    const monthlyData = {};
    const supplierData = {};
    
    for (const purchase of approved) {
        const date = new Date(purchase.approvedAt || purchase.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { total: 0, count: 0, month: monthKey };
        }
        monthlyData[monthKey].total += purchase.totalAmount;
        monthlyData[monthKey].count++;
        
        if (!supplierData[purchase.supplierId]) {
            supplierData[purchase.supplierId] = {
                supplierId: purchase.supplierId,
                supplierName: purchase.supplierName,
                totalSpent: 0,
                orderCount: 0,
                averageOrderValue: 0
            };
        }
        supplierData[purchase.supplierId].totalSpent += purchase.totalAmount;
        supplierData[purchase.supplierId].orderCount++;
    }
    
    for (const supplier of Object.values(supplierData)) {
        supplier.averageOrderValue = supplier.totalSpent / supplier.orderCount;
    }
    
    const sortedMonths = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    const sortedSuppliers = Object.values(supplierData).sort((a, b) => b.totalSpent - a.totalSpent);
    
    return {
        monthlyTrend: sortedMonths.slice(-months),
        topSuppliers: sortedSuppliers.slice(0, 10),
        totalSpent: approved.reduce((sum, p) => sum + p.totalAmount, 0),
        totalOrders: approved.length
    };
}

// ============================================================================
// STOCK TURNOVER RATE
// ============================================================================
function inv_calculateStockTurnoverRate(ingredientId, days = 30) {
    const consumption = getConsumptionByPeriod(ingredientId, days);
    const avgStock = inv_getStock(ingredientId);
    
    if (avgStock === 0) return 0;
    return consumption.total / avgStock;
}

function inv_getInventoryTurnoverOverall(days = 30) {
    const ingredients = inv_getIngredients().filter(i => !i.archived);
    let totalConsumption = 0;
    let totalAvgStock = 0;
    
    for (const ingredient of ingredients) {
        const consumption = getConsumptionByPeriod(ingredient.id, days);
        const avgStock = inv_getStock(ingredient.id);
        
        totalConsumption += consumption.total;
        totalAvgStock += avgStock;
    }
    
    if (totalAvgStock === 0) return 0;
    return totalConsumption / totalAvgStock;
}

// ============================================================================
// EXPORT FUNCTIONS FOR UI
// ============================================================================
function inv_exportVarianceToCSV() {
    const reports = inv_getVarianceReports();
    if (reports.length === 0) {
        if (typeof showToast === 'function') {
            showToast('No variance reports to export', 'warning');
        }
        return;
    }
    
    let csvRows = [
        ['Report ID', 'Date', 'Session ID', 'Ingredient', 'Expected', 'Physical', 'Variance', 'Variance %', 'Severity']
    ];
    
    for (const report of reports) {
        for (const result of report.results) {
            csvRows.push([
                report.id,
                new Date(report.createdAt).toLocaleString(),
                report.countSessionId,
                result.ingredientName,
                result.expectedQty,
                result.physicalQty || '',
                result.variance,
                result.variancePct?.toFixed(2) || '',
                result.severity
            ]);
        }
    }
    
    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variance_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (typeof showToast === 'function') {
        showToast('Variance report exported to CSV');
    }
}

function inv_exportStockToCSV() {
    const ingredients = inv_getEnrichedIngredients();
    
    let csvRows = [
        ['ID', 'Name', 'Unit', 'Category', 'Current Stock', 'Min Threshold', 'Cost Per Unit', 'Total Value', 'Status']
    ];
    
    for (const ing of ingredients) {
        csvRows.push([
            ing.id,
            ing.name,
            ing.unit,
            ing.category,
            ing.currentQty,
            ing.minThreshold,
            ing.costPerUnit,
            ing.value,
            ing.status
        ]);
    }
    
    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (typeof showToast === 'function') {
        showToast('Stock report exported to CSV');
    }
}

// ============================================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================================
if (typeof window !== 'undefined') {
    window.deductStockForOrder = deductStockForOrder;
    window.calculateVariance = calculateVariance;
    window.getTheoreticalConsumption = getTheoreticalConsumption;
    window.getConsumptionByPeriod = getConsumptionByPeriod;
    window.inv_isPriceAnomalous = inv_isPriceAnomalous;
    window.inv_getReorderSuggestions = inv_getReorderSuggestions;
    window.inv_checkAllStockLevels = inv_checkAllStockLevels;
    window.inv_getStockStatus = inv_getStockStatus;
    window.inv_getStockStatusColor = inv_getStockStatusColor;
    window.inv_calculateRecipeCost = inv_calculateRecipeCost;
    window.inv_calculatePotentialProfit = inv_calculatePotentialProfit;
    window.inv_calculateGrossProfitMargin = inv_calculateGrossProfitMargin;
    window.inv_createBatch = inv_createBatch;
    window.inv_getBatches = inv_getBatches;
    window.inv_consumeFromBatch = inv_consumeFromBatch;
    window.inv_getShiftVariance = inv_getShiftVariance;
    window.inv_checkAutoReorder = inv_checkAutoReorder;
    window.inv_createAutoReorderPurchase = inv_createAutoReorderPurchase;
    window.inv_getWastageByCategory = inv_getWastageByCategory;
    window.inv_getTopWastageItems = inv_getTopWastageItems;
    window.inv_getPurchaseTrends = inv_getPurchaseTrends;
    window.inv_calculateStockTurnoverRate = inv_calculateStockTurnoverRate;
    window.inv_getInventoryTurnoverOverall = inv_getInventoryTurnoverOverall;
    window.inv_exportVarianceToCSV = inv_exportVarianceToCSV;
    window.inv_exportStockToCSV = inv_exportStockToCSV;
}

// ============================================================================
// AUTO-START BACKGROUND CHECKS
// ============================================================================
if (typeof window !== 'undefined') {
    setTimeout(() => {
        inv_checkAllStockLevels();
    }, 1000);
    
    setInterval(() => {
        inv_checkAllStockLevels();
    }, 300000);
}