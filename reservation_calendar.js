/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: reservation_calendar.js – FullCalendar integration for reservations  ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

let calendar = null;

function initReservationCalendar() {
  const calendarEl = document.getElementById('reservation-calendar');
  if (!calendarEl) return;
  if (calendar) calendar.destroy();
  
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: app.reservations.filter(r => r.status === 'confirmed').map(r => ({
      id: r.id,
      title: `${r.tableName} - ${r.clientName || 'Walk-in'}`,
      start: `${r.date}T${r.startTime}`,
      end: `${r.date}T${r.endTime}`,
      extendedProps: r
    })),
    eventClick: function(info) {
      const res = info.event.extendedProps;
      // Show reservation details – you can open a small modal or prompt
      showCustomAlert('Reservation Details',
        `Table: ${res.tableName}\nDate: ${res.date} ${res.startTime}\nClient: ${res.clientName || 'Walk-in'}\nPhone: ${res.clientPhone}\nNotes: ${res.notes}`
      );
    },
    eventDidMount: function(info) {
      // Optional: color code by table or client
    }
  });
  calendar.render();
}

function refreshCalendar() {
  if (calendar) {
    calendar.removeAllEvents();
    calendar.addEventSource(app.reservations.filter(r => r.status === 'confirmed').map(r => ({
      id: r.id,
      title: `${r.tableName} - ${r.clientName || 'Walk-in'}`,
      start: `${r.date}T${r.startTime}`,
      end: `${r.date}T${r.endTime}`,
      extendedProps: r
    })));
  }
}