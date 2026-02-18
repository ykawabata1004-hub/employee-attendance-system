// ===================================
// Calendar View
// ===================================

const CalendarView = {
  currentDate: new Date(),
  viewMode: 'month', // 'day', 'week', 'month'
  selectedLocation: 'all',
  selectedDepartment: 'all',
  selectedEmployee: 'all',

  /**
   * Initialize calendar
   */
  init() {
    this.render();
    this.attachEventListeners();
  },

  /**
   * Render calendar
   */
  render() {
    const container = document.getElementById('calendar-view');
    if (!container) return;

    container.innerHTML = `
      <div class="calendar-container">
        ${this.renderHeader()}
        ${this.renderFilters()}
        ${this.renderCalendar()}
      </div>
    `;
  },

  /**
   * Render header
   */
  renderHeader() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const title = this.viewMode === 'month'
      ? `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`
      : this.formatDate(this.currentDate);

    return `
      <div class="calendar-header">
        <h2 class="calendar-title">${title}</h2>
        <div class="calendar-controls">
          <button class="btn btn-secondary btn-sm" onclick="CalendarView.previousPeriod()">
            ← Prev
          </button>
          <button class="btn btn-secondary btn-sm" onclick="CalendarView.today()">
            Today
          </button>
          <button class="btn btn-secondary btn-sm" onclick="CalendarView.nextPeriod()">
            Next →
          </button>
          <div class="btn-group">
            <button class="btn ${this.viewMode === 'day' ? 'btn-primary' : 'btn-secondary'} btn-sm" 
                    onclick="CalendarView.setViewMode('day')">Day</button>
            <button class="btn ${this.viewMode === 'week' ? 'btn-primary' : 'btn-secondary'} btn-sm" 
                    onclick="CalendarView.setViewMode('week')">Week</button>
            <button class="btn ${this.viewMode === 'month' ? 'btn-primary' : 'btn-secondary'} btn-sm" 
                    onclick="CalendarView.setViewMode('month')">Month</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render filters
   */
  renderFilters() {
    const locations = DataModel.getLocations();
    const employees = DataModel.getAllEmployees();
    const departments = [...new Set(employees.map(e => e.department))];

    return `
      <div class="filter-bar">
        <div class="filter-group">
          <label class="form-label">Location</label>
          <select class="form-select" id="filter-location" onchange="CalendarView.applyFilters()">
            <option value="all">All Locations</option>
            ${locations.map(loc => `<option value="${loc}" ${this.selectedLocation === loc ? 'selected' : ''}>${loc}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="form-label">Department</label>
          <select class="form-select" id="filter-department" onchange="CalendarView.applyFilters()">
            <option value="all">All Departments</option>
            ${departments.map(dept => `<option value="${dept}" ${this.selectedDepartment === dept ? 'selected' : ''}>${dept}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="form-label">Employee</label>
          <select class="form-select" id="filter-employee" onchange="CalendarView.applyFilters()">
            <option value="all">All Employees</option>
            ${this.getFilteredEmployees().map(emp =>
      `<option value="${emp.id}" ${this.selectedEmployee === emp.id ? 'selected' : ''}>${emp.name}</option>`
    ).join('')}
          </select>
        </div>
      </div>
    `;
  },

  /**
   * Render calendar body
   */
  renderCalendar() {
    switch (this.viewMode) {
      case 'day':
        return this.renderDayView();
      case 'week':
        return this.renderWeekView();
      case 'month':
        return this.renderMonthView();
      default:
        return this.renderMonthView();
    }
  },

  /**
   * Render month view
   */
  renderMonthView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    // Generate 6 weeks of calendar
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return `
      <div class="calendar-grid">
        ${dayHeaders.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
        ${days.map(day => this.renderDay(day, month)).join('')}
      </div>
    `;
  },

  /**
   * Render week view
   */
  renderWeekView() {
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return `
      <div class="calendar-grid">
        ${dayHeaders.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
        ${days.map(day => this.renderDay(day, this.currentDate.getMonth())).join('')}
      </div>
    `;
  },

  /**
   * Render day view
   */
  renderDayView() {
    const employees = this.getFilteredEmployees();
    const dateStr = DataModel.formatDate(this.currentDate);
    const attendance = DataModel.getAttendanceByDate(dateStr);

    return `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Location</th>
              <th>Department</th>
              <th>Status</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${employees.map(emp => {
      const att = attendance.find(a => a.employeeId === emp.id);
      const status = att ? att.status : 'office';
      const statusInfo = DataModel.getStatusInfo(status);
      return `
                <tr>
                  <td>${emp.name}</td>
                  <td>${emp.location}</td>
                  <td>${emp.department}</td>
                  <td><span class="status-badge status-${status}">${statusInfo.label}</span></td>
                  <td>${att ? att.note : ''}</td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Render single day
   */
  renderDay(date, currentMonth) {
    const isOtherMonth = date.getMonth() !== currentMonth;
    const isToday = this.isToday(date);
    const dateStr = DataModel.formatDate(date);

    const employees = this.getFilteredEmployees();
    const attendance = DataModel.getAttendanceByDate(dateStr);

    const todayStr = DataModel.formatDate(new Date());
    const isFuture = dateStr > todayStr;

    let events = employees.map(emp => {
      const canonicalId = emp.id.toString().trim().toLowerCase();
      const att = attendance.find(a => a.employeeId.toString().trim().toLowerCase() === canonicalId);

      // Default status
      let status = att ? att.status : 'out';

      // Filter for future dates: Only show trips and vacations
      if (isFuture) {
        if (!att || !['business_trip', 'vacation', 'sick'].includes(att.status)) {
          return null; // Don't show regular attendance on future dates
        }
      }

      const statusInfo = DataModel.getStatusInfo(status);

      return {
        employee: emp,
        status: status,
        statusInfo: statusInfo,
        note: att ? att.note : '',
        country: att ? (att.country || att.destination || '') : '',
        priority: DataModel.STATUS_PRIORITY[status] || 0
      };
    }).filter(e => e !== null);

    // Sort by priority (descending) to show most important first
    events.sort((a, b) => b.priority - a.priority);

    const classes = ['calendar-day'];
    if (isOtherMonth) classes.push('other-month');
    if (isToday) classes.push('today');

    return `
      <div class="${classes.join(' ')}" onclick="CalendarView.onDayClick('${dateStr}')">
        <div class="calendar-day-number">${date.getDate()}</div>
        <div class="calendar-day-events">
          ${events.slice(0, 3).map(event => {
      const displayName = event.status === 'business_trip' && event.note ?
        `${event.employee.name} (${event.note.substring(0, 10)}${event.note.length > 10 ? '...' : ''})` :
        event.employee.name;

      const tooltip = [
        `${event.employee.name}: ${event.statusInfo.label}`,
        event.country ? `Country: ${event.country}` : null,
        event.note ? `Note: ${event.note}` : null
      ].filter(Boolean).join(' - ');

      return `
            <div class="calendar-event status-${event.status}" title="${tooltip}">
              ${displayName}
            </div>
          `}).join('')}
          ${events.length > 3 ? `<div class="calendar-event-more">+${events.length - 3} more</div>` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Apply filters
   */
  applyFilters() {
    this.selectedLocation = document.getElementById('filter-location').value;
    this.selectedDepartment = document.getElementById('filter-department').value;
    this.selectedEmployee = document.getElementById('filter-employee').value;
    this.render();
  },

  /**
   * Get filtered employee list
   */
  getFilteredEmployees() {
    let employees = DataModel.getAllEmployees();

    if (this.selectedLocation !== 'all') {
      employees = employees.filter(e => e.location === this.selectedLocation);
    }

    if (this.selectedDepartment !== 'all') {
      employees = employees.filter(e => e.department === this.selectedDepartment);
    }

    if (this.selectedEmployee !== 'all') {
      employees = employees.filter(e => e.id === this.selectedEmployee);
    }

    return employees;
  },

  /**
   * Change view mode
   */
  setViewMode(mode) {
    this.viewMode = mode;
    this.render();
  },

  /**
   * Go to previous period
   */
  previousPeriod() {
    switch (this.viewMode) {
      case 'day':
        this.currentDate.setDate(this.currentDate.getDate() - 1);
        break;
      case 'week':
        this.currentDate.setDate(this.currentDate.getDate() - 7);
        break;
      case 'month':
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        break;
    }
    this.render();
  },

  /**
   * Go to next period
   */
  nextPeriod() {
    switch (this.viewMode) {
      case 'day':
        this.currentDate.setDate(this.currentDate.getDate() + 1);
        break;
      case 'week':
        this.currentDate.setDate(this.currentDate.getDate() + 7);
        break;
      case 'month':
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        break;
    }
    this.render();
  },

  /**
   * Go to today
   */
  today() {
    this.currentDate = new Date();
    this.render();
  },

  /**
   * Date click handler
   */
  onDayClick(dateStr) {
    if (this.viewMode === 'month') {
      this.currentDate = new Date(dateStr);
      this.setViewMode('day');
    }
  },

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Additional event listeners if needed
  },

  /**
   * Check if today
   */
  isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  },

  /**
   * Format date
   */
  formatDate(date) {
    return DataModel.formatDate(date);
  }
};

// Export globally
window.CalendarView = CalendarView;
