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

    // Cleanup old records (> 1.5 years)
    DataModel.cleanupOldRecords();

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
      // Store params for later use
      this.currentCheckinParams = {
        type: checkinType.toLowerCase(),
        loc: params.get('loc') || ''
      };

      // Show User Selection Modal
      const modal = document.getElementById('qr-user-modal');
      if (modal) {
        modal.classList.remove('hidden');
        this.renderQRUserList();
        // Focus search box
        setTimeout(() => document.getElementById('qr-user-search').focus(), 100);
      }
    }
  },

  /**
   * Render QR User List with filter
   */
  renderQRUserList(filterText = '') {
    const listContainer = document.getElementById('qr-user-list');
    if (!listContainer) return;

    const employees = DataModel.getAllEmployees();
    const normalizedFilter = filterText.toLowerCase().trim();

    const filtered = employees.filter(emp => {
      return emp.name.toLowerCase().includes(normalizedFilter) ||
        (emp.department && emp.department.toLowerCase().includes(normalizedFilter)) ||
        (emp.location && emp.location.toLowerCase().includes(normalizedFilter));
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">No users found</div>';
      return;
    }

    listContainer.innerHTML = filtered.map(emp => {
      const positionLabel = DataModel.getPositionInfo(emp.position).label;
      return `
        <div class="calendar-event" style="padding: 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: var(--surface-color); border: 1px solid var(--border-color); color: var(--text-primary);"
             onclick="App.selectQRUser('${emp.id}')">
            <div>
                <div style="font-weight: 600;">${emp.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${emp.department || '-'} / ${emp.location || '-'}</div>
            </div>
            <div style="font-size: 0.8rem; background: var(--hover-bg); padding: 0.2rem 0.5rem; border-radius: 4px;">
                ${positionLabel}
            </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Filter QR Users
   */
  filterQRUsers() {
    const input = document.getElementById('qr-user-search');
    this.renderQRUserList(input.value);
  },

  /**
   * Select user for QR check-in
   */
  selectQRUser(employeeId) {
    if (!this.currentCheckinParams) return;

    // Set current user
    DataModel.setCurrentUser(employeeId);
    this.renderUserSelector(); // Update UI header

    const { type, loc } = this.currentCheckinParams;
    const user = DataModel.getEmployeeById(employeeId);
    const today = DataModel.formatDate(new Date());

    if (['office', 'wfh'].includes(type)) {
      const locationLabel = loc ? ` at ${loc}` : '';
      DataModel.addAttendance({
        employeeId: user.id,
        date: today,
        status: type,
        note: `QR Check-in (${type.toUpperCase()}${locationLabel})`
      });

      // Remove parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Close modal
      this.closeQRModal();

      alert(`Successfully checked in as ${user.name} for ${type.toUpperCase()}!`);

      // Refresh UI
      this.switchView(this.currentView);
    }
  },

  /**
   * Close QR Modal
   */
  closeQRModal() {
    document.getElementById('qr-user-modal').classList.add('hidden');
    this.currentCheckinParams = null;
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Export globally
window.App = App;
