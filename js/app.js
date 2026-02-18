// ===================================
// Main Application Controller
// ===================================

const App = {
  currentView: 'calendar',

  /**
   * Initialize application
   */
  async init() {
    // Show loading state if needed
    console.log('App initializing...');

    // Initialize DataModel (Firebase Sync)
    await DataModel.init();

    // Initialize Sample Data if necessary
    if (typeof SampleData !== 'undefined') {
      SampleData.initializeSampleData();
    }

    // Process QR Check-in via URL parameters
    this.processQRCheckin();

    this.renderLayout();
    this.switchView('calendar');
    this.renderUserSelector();

    console.log('App initialized');
  },

  /**
   * Render main layout
   */
  renderLayout() {
    const appContainer = document.getElementById('app');

    appContainer.innerHTML = `
            <header class="header">
                <div class="header-content">
                    <div>
                        <h1 class="header-title">Employee Attendance System</h1>
                        <p class="header-subtitle">European Locations (LDN/DSS/HBG/PRS/MIL)</p>
                    </div>
                    <div id="user-selector"></div>
                </div>
            </header>

            <nav class="nav-tabs">
                <button class="nav-tab active" data-view="calendar" onclick="App.switchView('calendar')">
                    📅 Calendar
                </button>
                <button class="nav-tab" data-view="list" onclick="App.switchView('list')">
                    📋 List & Search
                </button>
                <button class="nav-tab" data-view="input" onclick="App.switchView('input')">
                    ✏️ Register Status
                </button>
                <button class="nav-tab" data-view="employee" onclick="App.switchView('employee')">
                    👥 Employee Management
                </button>
            </nav>

            <main class="main-content">
                <div id="calendar-view" class="view"></div>
                <div id="list-view" class="view hidden"></div>
                <div id="input-view" class="view hidden"></div>
                <div id="employee-view" class="view hidden"></div>
            </main>
        `;
  },

  /**
   * Render user selector
   */
  renderUserSelector() {
    const container = document.getElementById('user-selector');
    const currentUser = DataModel.getCurrentUser();
    const employees = DataModel.getAllEmployees();

    if (employees.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary); font-size: var(--font-size-sm);">No users available</p>';
      return;
    }

    const roleInfo = currentUser ? DataModel.getRoleInfo(currentUser.role) : null;

    container.innerHTML = `
            <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                <label style="color: var(--text-secondary); font-size: var(--font-size-sm);">Current User:</label>
                <select class="form-select" style="width: auto; min-width: 200px;" onchange="App.onUserChange(this.value)">
                    ${employees.map(emp => {
      const empRoleInfo = DataModel.getRoleInfo(emp.role);
      return `<option value="${emp.id}" ${currentUser && currentUser.id === emp.id ? 'selected' : ''}>
                            ${emp.name} (${empRoleInfo.label})
                        </option>`;
    }).join('')}
                </select>
                ${roleInfo ? `<span class="status-badge status-${currentUser.role}">${roleInfo.label}</span>` : ''}
            </div>
        `;
  },

  /**
   * Handle user change
   */
  onUserChange(employeeId) {
    DataModel.setCurrentUser(employeeId);
    this.renderUserSelector();

    // Refresh current view to apply permissions
    this.switchView(this.currentView);
  },

  /**
   * Switch view
   */
  switchView(viewId) {
    this.currentView = viewId;

    // Update tab states
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.view === viewId) {
        tab.classList.add('active');
      }
    });

    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.add('hidden');
    });

    // Show selected view
    const selectedView = document.getElementById(`${viewId}-view`);
    if (selectedView) {
      selectedView.classList.remove('hidden');
    }

    // Initialize view
    switch (viewId) {
      case 'calendar':
        CalendarView.init();
        break;
      case 'list':
        ListView.init();
        break;
      case 'input':
        InputForm.init();
        break;
      case 'employee':
        EmployeeManager.init();
        break;
    }
  },

  /**
   * Process QR code check-in from URL parameters (?checkin=office|wfh)
   */
  processQRCheckin() {
    const params = new URLSearchParams(window.location.search);
    const checkinType = params.get('checkin');

    if (checkinType) {
      const user = DataModel.getCurrentUser();
      if (!user) {
        alert('Please select your name first at the top-right to use QR check-in.');
        return;
      }

      const today = DataModel.formatDate(new Date());
      const status = checkinType.toLowerCase();
      const loc = params.get('loc') || '';

      if (['office', 'wfh'].includes(status)) {
        const locationLabel = loc ? ` at ${loc}` : '';
        DataModel.addAttendance({
          employeeId: user.id,
          date: today,
          status: status,
          note: `QR Check-in (${status.toUpperCase()}${locationLabel})`
        });

        // Remove parameter from URL without reloading
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        alert(`Successfully checked in as ${status.toUpperCase()}!`);

        // Refresh UI
        this.switchView(this.currentView);
      }
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Export globally
window.App = App;
