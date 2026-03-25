/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: employee_manager.js – Enhanced Employee Data and Logic               ║
║         (Clock In/Out, Breaks, Overtime, Attendance, Dashboard)             ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

// Ensure 'app' object exists globally. This typically comes from 'app.js'.
// For this context, we assume 'app' is already initialized with 'employees' array.
if (typeof app === 'undefined') {
  // Fallback for standalone testing, normally 'app' is globally defined.
  window.app = {
    employees: JSON.parse(localStorage.getItem('pos_employees') || '[]')
  };
}

// CRUD for employees
function addEmployee(emp) {
  // Generate a unique ID for the new employee
  emp.id = 'EMP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  emp.created = new Date().toISOString(); // Track creation date

  // Initialize enhanced fields if not present
  if (!emp.idCard) emp.idCard = '';
  if (!emp.address) emp.address = '';
  if (!emp.relativeName) emp.relativeName = '';
  if (!emp.relativePhone) emp.relativePhone = '';
  if (!emp.relativeRelation) emp.relativeRelation = '';
  if (!emp.relativeAddress) emp.relativeAddress = '';
  if (!emp.dutyHours) emp.dutyHours = 12; // Default 12 hours
  if (!emp.ledger) emp.ledger = [];
  if (!emp.attendance) emp.attendance = [];

  app.employees.push(emp);
  localStorage.setItem('pos_employees', JSON.stringify(app.employees));
}

function updateEmployee(id, updates) {
  const idx = app.employees.findIndex(e => e.id === id);
  if (idx !== -1) {
    app.employees[idx] = { ...app.employees[idx], ...updates };
    localStorage.setItem('pos_employees', JSON.stringify(app.employees));
  }
}

function deleteEmployee(id) {
  app.employees = app.employees.filter(e => e.id !== id);
  // Also clean up ledger and attendance records for the deleted employee from the global arrays
  // (Assuming L and A exist globally within the app context if not attached directly to employee objects initially)
  if (window.app && window.app.L) {
      window.app.L = window.app.L.filter(l => l.sid !== id);
  }
  if (window.app && window.app.A) {
      window.app.A = window.app.A.filter(a => a.sid !== id);
  }
  // If ledger and attendance are nested under employee objects, they are automatically removed with the employee.
  localStorage.setItem('pos_employees', JSON.stringify(app.employees));
}

// ========== CLOCK IN/OUT & BREAKS ==========

// Clock In
function clockIn(employeeId) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (!emp) return { success: false, message: 'Employee not found' };

  const today = new Date().toISOString().split('T')[0];
  // Ensure attendance array exists
  if (!emp.attendance) emp.attendance = [];
  let attendance = emp.attendance.find(a => a.date === today);

  if (!attendance) {
    // Create new attendance record for the day
    attendance = {
      id: 'ATT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      date: today,
      status: 'present',
      clock_in: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      clock_out: null,
      break_start: null,
      break_end: null,
      total_break: 0,
      regular_hours: 0,
      overtime_hours: 0,
      hours: 0,
      pay: 0,
      note: '',
      manual_override: false
    };
    emp.attendance.push(attendance);
  } else {
    // Check if already clocked in for the day
    if (attendance.clock_in && !attendance.clock_out) {
      return { success: false, message: 'Already clocked in. Please clock out first.' };
    }
    // Clocking in again after a previous clock-out or if status was not 'present'
    attendance.clock_in = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    attendance.status = 'present';
    attendance.clock_out = null; // Clear clock out if re-clocking
    attendance.break_start = null; // Clear break times
    attendance.break_end = null;
    attendance.total_break = 0; // Reset total break for the new session
    attendance.regular_hours = 0; // Reset hours and pay
    attendance.overtime_hours = 0;
    attendance.hours = 0;
    attendance.pay = 0;
  }

  localStorage.setItem('pos_employees', JSON.stringify(app.employees));
  return { success: true, message: 'Clocked in successfully', attendance: attendance };
}

// Clock Out
function clockOut(employeeId) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (!emp) return { success: false, message: 'Employee not found' };

  const today = new Date().toISOString().split('T')[0];
  const attendance = emp.attendance?.find(a => a.date === today);

  if (!attendance || !attendance.clock_in) {
    return { success: false, message: 'Not clocked in today' };
  }

  if (attendance.clock_out) {
    return { success: false, message: 'Already clocked out today' };
  }

  // If break is ongoing, end it automatically before clocking out
  if (attendance.break_start && !attendance.break_end) {
    const breakResult = endBreak(employeeId); // Call internal endBreak
    if (!breakResult.success) {
      console.warn("Could not auto-end break before clocking out:", breakResult.message);
    }
  }

  attendance.clock_out = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Calculate total hours and overtime
  calculateDailyHours(attendance, emp.dutyHours || 12, emp.wage || 0);

  localStorage.setItem('pos_employees', JSON.stringify(app.employees));
  return { success: true, message: 'Clocked out successfully', attendance: attendance };
}

// Start Break
function startBreak(employeeId) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (!emp) return { success: false, message: 'Employee not found' };

  const today = new Date().toISOString().split('T')[0];
  const attendance = emp.attendance?.find(a => a.date === today);

  if (!attendance || !attendance.clock_in) {
    return { success: false, message: 'Must clock in first' };
  }

  if (attendance.clock_out) {
    return { success: false, message: 'Already clocked out' };
  }

  if (attendance.break_start && !attendance.break_end) {
    return { success: false, message: 'Break already started' };
  }

  attendance.break_start = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  attendance.break_end = null; // Ensure break_end is null for an active break

  localStorage.setItem('pos_employees', JSON.stringify(app.employees));
  return { success: true, message: 'Break started', attendance: attendance };
}

// End Break
function endBreak(employeeId) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (!emp) return { success: false, message: 'Employee not found' };

  const today = new Date().toISOString().split('T')[0];
  const attendance = emp.attendance?.find(a => a.date === today);

  if (!attendance || !attendance.break_start || attendance.break_end) {
    return { success: false, message: 'No active break to end' };
  }

  attendance.break_end = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Calculate break duration in minutes
  // Using fixed date to avoid date boundary issues, only time matters
  const start = new Date(`1970-01-01T${attendance.break_start}`);
  const end = new Date(`1970-01-01T${attendance.break_end}`);
  const breakMinutes = Math.round((end - start) / 60000);
  attendance.total_break = (attendance.total_break || 0) + breakMinutes;

  localStorage.setItem('pos_employees', JSON.stringify(app.employees));
  return { success: true, message: 'Break ended', attendance: attendance };
}

// Calculate daily hours and overtime
function calculateDailyHours(attendance, dutyHours, wage) {
  if (!attendance.clock_in || !attendance.clock_out) return;

  const start = new Date(`1970-01-01T${attendance.clock_in}`);
  const end = new Date(`1970-01-01T${attendance.clock_out}`);
  let totalMinutes = (end - start) / 60000;

  // Subtract break time
  totalMinutes -= attendance.total_break || 0;

  const totalHours = Math.max(0, totalMinutes / 60); // Ensure hours don't go negative
  attendance.hours = parseFloat(totalHours.toFixed(2));

  // Calculate overtime
  const duty = dutyHours || 12; // Default to 12 if not set
  if (totalHours > duty) {
    attendance.overtime_hours = parseFloat((totalHours - duty).toFixed(2));
    attendance.regular_hours = duty;
  } else {
    attendance.overtime_hours = 0;
    attendance.regular_hours = totalHours;
  }

  // Calculate pay (regular * wage + overtime * wage * 1.5)
  // Ensure wage is a number
  const employeeWage = wage || 0;
  attendance.pay = Math.round(attendance.regular_hours * employeeWage + attendance.overtime_hours * employeeWage * 1.5);
}

// Manual override of attendance (for admin)
function overrideAttendance(employeeId, date, data) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (!emp) return { success: false, message: 'Employee not found' };

  // Ensure attendance array exists
  if (!emp.attendance) emp.attendance = [];
  let attendance = emp.attendance.find(a => a.date === date);
  if (!attendance) {
    attendance = {
      id: 'ATT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      date: date,
      manual_override: true,
      status: 'present', // Default status for manual override
      clock_in: null, clock_out: null, break_start: null, break_end: null,
      total_break: 0, regular_hours: 0, overtime_hours: 0, hours: 0, pay: 0, note: ''
    };
    emp.attendance.push(attendance);
  }

  // Update fields
  Object.assign(attendance, data);
  attendance.manual_override = true;

  // Recalculate if needed (e.g., if clock_in/out times were manually updated)
  if (attendance.status === 'present' || attendance.status === 'half') {
    if (attendance.clock_in && attendance.clock_out) {
      calculateDailyHours(attendance, emp.dutyHours || 12, emp.wage || 0);
    } else if (attendance.status === 'half') {
      // For half-day status set manually, calculate half of duty hours if no clock times
      const duty = emp.dutyHours || 12;
      attendance.hours = duty / 2;
      attendance.regular_hours = duty / 2;
      attendance.overtime_hours = 0;
      attendance.pay = Math.round((duty / 2) * (emp.wage || 0));
    }
  } else {
    // If status is not 'present' or 'half', clear time/pay related fields
    attendance.clock_in = null;
    attendance.clock_out = null;
    attendance.break_start = null;
    attendance.break_end = null;
    attendance.total_break = 0;
    attendance.regular_hours = 0;
    attendance.overtime_hours = 0;
    attendance.hours = 0;
    attendance.pay = 0;
  }

  localStorage.setItem('pos_employees', JSON.stringify(app.employees));
  return { success: true, message: 'Attendance updated', attendance: attendance };
}

// ========== ATTENDANCE SUMMARY ==========

// Get today's attendance summary for dashboard
function getTodayAttendanceSummary() {
  const today = new Date().toISOString().split('T')[0];
  const summary = {
    total: app.employees.length,
    present: 0,
    absent: 0,
    sick: 0,
    leave: 0,
    off: 0, // This status isn't explicitly used in add/update functions, but included for consistency
    half: 0,
    unmarked: 0,
    clockedIn: 0
  };

  app.employees.forEach(emp => {
    // Ensure attendance array exists
    if (!emp.attendance) emp.attendance = [];
    const attendance = emp.attendance.find(a => a.date === today);

    if (!attendance) {
      summary.unmarked++;
      return;
    }

    // Count by status
    if (attendance.status === 'present') summary.present++;
    else if (attendance.status === 'absent') summary.absent++;
    else if (attendance.status === 'sick') summary.sick++;
    else if (attendance.status === 'leave') summary.leave++;
    else if (attendance.status === 'off') summary.off++;
    else if (attendance.status === 'half') summary.half++;

    // Count currently clocked in (clock_in exists and no clock_out)
    if (attendance.clock_in && !attendance.clock_out) {
      summary.clockedIn++;
    }
  });

  return summary;
}

// Get list of currently clocked-in employees
function getClockedInEmployees() {
  const today = new Date().toISOString().split('T')[0];
  const clockedIn = [];

  app.employees.forEach(emp => {
    // Ensure attendance array exists
    if (!emp.attendance) emp.attendance = [];
    const attendance = emp.attendance.find(a => a.date === today);
    if (attendance && attendance.clock_in && !attendance.clock_out) {
      clockedIn.push({
        id: emp.id,
        name: emp.name,
        clockInTime: attendance.clock_in,
        breakStarted: !!(attendance.break_start && !attendance.break_end)
      });
    }
  });

  return clockedIn;
}

// Get attendance for a date range
function getAttendanceRange(employeeId, startDate, endDate) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (!emp || !emp.attendance) return [];

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return emp.attendance.filter(a => {
    const d = new Date(a.date).getTime();
    return d >= start && d <= end;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

// ========== CASH LEDGER ==========
function addCashTransaction(employeeId, transaction) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (emp) {
    if (!emp.ledger) emp.ledger = [];
    emp.ledger.push({
      date: transaction.date || new Date().toISOString().split('T')[0], // Use provided date or today's date
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      type: transaction.type,
      amount: parseFloat(transaction.amount) || 0,
      reason: transaction.reason || '',
      where: transaction.where || '',
      note: transaction.note || '',
      entryId: 'CASH-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      category: 'cash'
    });
    localStorage.setItem('pos_employees', JSON.stringify(app.employees));
  }
}

function getEmployeeCashBalance(employeeId) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (!emp || !emp.ledger) return 0;
  return emp.ledger.reduce((bal, t) => t.type === 'cash_in' ? bal + t.amount : bal - t.amount, 0);
}

// Function to delete a cash ledger entry
function deleteCashLedgerEntry(employeeId, entryId) {
  const emp = app.employees.find(e => e.id === employeeId);
  if (emp && emp.ledger) {
    emp.ledger = emp.ledger.filter(entry => entry.entryId !== entryId);
    localStorage.setItem('pos_employees', JSON.stringify(app.employees));
    return { success: true, message: 'Transaction deleted' };
  }
  return { success: false, message: 'Employee or entry not found' };
}