/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: reservation_manager.js – Reservation data and logic                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

// Load from localStorage
if (!app.reservations) {
  app.reservations = JSON.parse(localStorage.getItem('pos_reservations')) || [];
}

function saveReservations() {
  localStorage.setItem('pos_reservations', JSON.stringify(app.reservations));
}

// Create a new reservation
function addReservation(res) {
  res.id = 'RES-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  res.status = 'confirmed';
  app.reservations.push(res);
  saveReservations();
  if (typeof renderAllTables === 'function') renderAllTables(); // refresh table colors
}

// Update an existing reservation
function updateReservation(id, updates) {
  const idx = app.reservations.findIndex(r => r.id === id);
  if (idx !== -1) {
    app.reservations[idx] = { ...app.reservations[idx], ...updates };
    saveReservations();
    renderAllTables();
  }
}

// Cancel (soft delete)
function cancelReservation(id) {
  const res = app.reservations.find(r => r.id === id);
  if (res) {
    res.status = 'cancelled';
    saveReservations();
    renderAllTables();
  }
}

// Check if a table is free for a given time slot (considering margins)
function isTableFree(tableName, date, startTime, endTime, excludeReservationId = null) {
  // Convert to comparable timestamps (just date + time)
  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);
  const marginBefore = appSettings.reservation?.beforeMargin || 30;
  const marginAfter = appSettings.reservation?.afterMargin || 30;
  
  // Adjust start/end by margins for comparison
  const adjustedStart = new Date(start.getTime() - marginBefore * 60000);
  const adjustedEnd = new Date(end.getTime() + marginAfter * 60000);
  
  // Get all active (confirmed) reservations except the one being edited
  const active = app.reservations.filter(r =>
    r.status === 'confirmed' &&
    r.tableName === tableName &&
    r.id !== excludeReservationId
  );
  
  for (let r of active) {
    const rStart = new Date(`${r.date}T${r.startTime}`);
    const rEnd = new Date(`${r.date}T${r.endTime}`);
    // Overlap if periods intersect
    if (adjustedStart < rEnd && adjustedEnd > rStart) return false;
  }
  return true;
}

// Get all tables that are free for a given slot
function getFreeTables(date, startTime, endTime) {
  const allTables = getFlattenedTables().map(t => t.tableName);
  return allTables.filter(t => isTableFree(t, date, startTime, endTime));
}

// Calculate end time from start, duration and margins
function calculateEndTime(startTime, durationMinutes) {
  const [h, m] = startTime.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m + durationMinutes, 0, 0);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}