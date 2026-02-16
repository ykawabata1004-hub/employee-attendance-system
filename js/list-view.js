// ===================================
// List and Search View
// ===================================

const ListView = {
  searchQuery: '',
  filterLocation: 'all',
  filterDepartment: 'all',
  filterStatus: 'all',
  filterDate: DataModel.formatDate(new Date()),
  sortBy: 'name',
  sortOrder: 'asc',

  /**
   * Initialize list view
   */
  init() {
    this.render();
    this.attachEventListeners();
  },

  /**
   * Render list view
   */
  render() {
    const container = document.getElementById('list-view');
    if (!container) return;

    container.innerHTML = `
      <div class="card">
        ${this.renderSearchBar()}
        ${this.renderTable()}
      </div>
      <div class="card mt-lg">
        ${this.renderStatistics()}
      </div>
    `;
  },

  /**
   * Render search bar
   */
  renderSearchBar() {
    const locations = DataModel.getLocations();
    const employees = DataModel.getAllEmployees();
    const departments = [...new Set(employees.map(e => e.department))];
    const statuses = DataModel.getStatuses();

    return `
      <div class="card-header">
        <h2 class="card-title">Attendance Status List</h2>
      </div>
      <div class="filter-bar">
        <div class="search-box">
          <label class="form-label">Search</label>
          <input type="text" class="form-input" id="search-query" 
                 placeholder="Search by employee name..." 
                 value="${this.searchQuery}"
                 oninput="ListView.onSearchChange()">
        </div>
        <div class="filter-group">
          <label class="form-label">Date</label>
          <input type="date" class="form-input" id="filter-date" 
                 value="${this.filterDate}"
                 onchange="ListView.applyFilters()">
        </div>
        <div class="filter-group">
          <label class="form-label">Location</label>
          <select class="form-select" id="filter-location" onchange="ListView.applyFilters()">
            <option value="all">All Locations</option>
            ${locations.map(loc => `<option value="${loc}" ${this.filterLocation === loc ? 'selected' : ''}>${loc}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="form-label">Department</label>
          <select class="form-select" id="filter-department" onchange="ListView.applyFilters()">
            <option value="all">All Departments</option>
            ${departments.map(dept => `<option value="${dept}" ${this.filterDepartment === dept ? 'selected' : ''}>${dept}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="filter-status" onchange="ListView.applyFilters()">
            <option value="all">All Statuses</option>
            ${statuses.map(status => `<option value="${status.value}" ${this.filterStatus === status.value ? 'selected' : ''}>${status.label}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  },

  /**
   * Render table
   */
  renderTable() {
    const data = this.getFilteredData();

    if (data.length === 0) {
      return '<p style="padding: var(--spacing-lg); text-align: center; color: var(--text-secondary);">No matching data found</p>';
    }

    return `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th onclick="ListView.sort('name')" style="cursor: pointer;">
                Employee Name ${this.sortBy === 'name' ? (this.sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onclick="ListView.sort('location')" style="cursor: pointer;">
                Location ${this.sortBy === 'location' ? (this.sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onclick="ListView.sort('department')" style="cursor: pointer;">
                Department ${this.sortBy === 'department' ? (this.sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th>Position</th>
              <th onclick="ListView.sort('status')" style="cursor: pointer;">
                Status ${this.sortBy === 'status' ? (this.sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th>Note</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => {
      const statusInfo = DataModel.getStatusInfo(item.status);
      const positionInfo = DataModel.getPositionInfo(item.employee.position);
      const isAvailable = ['office', 'wfh'].includes(item.status);
      return `
                <tr>
                  <td>${item.employee.name}</td>
                  <td>${item.employee.location}</td>
                  <td>${item.employee.department}</td>
                  <td>${positionInfo.label}</td>
                  <td><span class="status-badge status-${item.status}">${statusInfo.label}</span></td>
                  <td>${item.note || '-'}</td>
                  <td>
                    <span style="color: ${isAvailable ? 'var(--status-office)' : 'var(--status-vacation)'}; font-weight: 600;">
                      ${isAvailable ? '✓ Available' : '✗ Unavailable'}
                    </span>
                  </td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Render statistics
   */
  renderStatistics() {
    const data = this.getFilteredData();
    const stats = {
      total: data.length,
      available: data.filter(d => ['office', 'wfh'].includes(d.status)).length,
      unavailable: data.filter(d => !['office', 'wfh'].includes(d.status)).length,
      byStatus: {}
    };

    DataModel.getStatuses().forEach(status => {
      stats.byStatus[status.value] = {
        count: data.filter(d => d.status === status.value).length,
        label: status.label,
        color: status.color
      };
    });

    return `
      <div class="card-header">
        <h2 class="card-title">Statistics (${this.filterDate})</h2>
      </div>
      <div style="padding: var(--spacing-lg);">
        <div class="flex gap-lg" style="margin-bottom: var(--spacing-lg);">
          <div class="card" style="flex: 1; text-align: center;">
            <h3 style="font-size: var(--font-size-3xl); color: var(--primary-color); margin-bottom: var(--spacing-sm);">
              ${stats.total}
            </h3>
            <p style="color: var(--text-secondary);">Total Employees</p>
          </div>
          <div class="card" style="flex: 1; text-align: center;">
            <h3 style="font-size: var(--font-size-3xl); color: var(--status-office); margin-bottom: var(--spacing-sm);">
              ${stats.available}
            </h3>
            <p style="color: var(--text-secondary);">Available</p>
          </div>
          <div class="card" style="flex: 1; text-align: center;">
            <h3 style="font-size: var(--font-size-3xl); color: var(--status-vacation); margin-bottom: var(--spacing-sm);">
              ${stats.unavailable}
            </h3>
            <p style="color: var(--text-secondary);">Unavailable</p>
          </div>
        </div>
        
        <h3 style="margin-bottom: var(--spacing-md);">Status Breakdown</h3>
        <div class="flex gap-md" style="flex-wrap: wrap;">
          ${Object.entries(stats.byStatus).map(([key, value]) => `
            <div class="status-badge status-${key}" style="padding: var(--spacing-md) var(--spacing-lg);">
              ${value.label}: ${value.count} employees
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Get filtered data
   */
  getFilteredData() {
    let employees = DataModel.getAllEmployees();
    const attendance = DataModel.getAttendanceByDate(this.filterDate);

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      employees = employees.filter(emp =>
        emp.name.toLowerCase().includes(query)
      );
    }

    // Filter by location
    if (this.filterLocation !== 'all') {
      employees = employees.filter(emp => emp.location === this.filterLocation);
    }

    // Filter by department
    if (this.filterDepartment !== 'all') {
      employees = employees.filter(emp => emp.department === this.filterDepartment);
    }

    // Combine employee and attendance data
    let data = employees.map(emp => {
      const att = attendance.find(a => a.employeeId === emp.id);
      return {
        employee: emp,
        status: att ? att.status : 'office',
        note: att ? att.note : ''
      };
    });

    // Filter by status
    if (this.filterStatus !== 'all') {
      data = data.filter(d => d.status === this.filterStatus);
    }

    // Sort
    data.sort((a, b) => {
      let aValue, bValue;

      switch (this.sortBy) {
        case 'name':
          aValue = a.employee.name;
          bValue = b.employee.name;
          break;
        case 'location':
          aValue = a.employee.location;
          bValue = b.employee.location;
          break;
        case 'department':
          aValue = a.employee.department;
          bValue = b.employee.department;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  },

  /**
   * Handle search change
   */
  onSearchChange() {
    this.searchQuery = document.getElementById('search-query').value;
    this.render();
  },

  /**
   * Apply filters
   */
  applyFilters() {
    this.filterDate = document.getElementById('filter-date').value;
    this.filterLocation = document.getElementById('filter-location').value;
    this.filterDepartment = document.getElementById('filter-department').value;
    this.filterStatus = document.getElementById('filter-status').value;
    this.render();
  },

  /**
   * Sort
   */
  sort(column) {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.render();
  },

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Additional event listeners if needed
  }
};

// Export globally
window.ListView = ListView;
