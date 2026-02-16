// ===================================
// Employee Master Management
// ===================================

const EmployeeManager = {
  editingId: null,

  /**
   * Initialize employee management view
   */
  init() {
    this.render();
    this.attachEventListeners();
  },

  /**
   * Render employee management view
   */
  render() {
    const container = document.getElementById('employee-view');
    if (!container) return;

    // Check permissions
    const canManage = DataModel.hasPermission('canManageEmployees');

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Employee Master</h2>
          ${canManage ? `
            <button class="btn btn-primary" onclick="EmployeeManager.showAddModal()">
              + Add Employee
            </button>
          ` : ''}
        </div>
        ${this.renderEmployeeList()}
      </div>
      <div class="card mt-lg">
        ${this.renderDataManagement()}
      </div>
    `;
  },

  /**
   * Render employee list
   */
  renderEmployeeList() {
    const employees = DataModel.getAllEmployees();
    const canManage = DataModel.hasPermission('canManageEmployees');

    if (employees.length === 0) {
      return '<p style="padding: var(--spacing-lg); text-align: center; color: var(--text-secondary);">No employees registered</p>';
    }

    return `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Department</th>
              <th>Position</th>
              <th>Role</th>
              <th>Manager</th>
              <th>Email</th>
              ${canManage ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${employees.map(emp => {
      const positionInfo = DataModel.getPositionInfo(emp.position);
      const roleInfo = DataModel.getRoleInfo(emp.role);
      const manager = emp.manager ? DataModel.getEmployeeById(emp.manager) : null;

      return `
              <tr>
                <td>${emp.id}</td>
                <td>${emp.name}</td>
                <td>${emp.location}</td>
                <td>${emp.department}</td>
                <td>${positionInfo.label}</td>
                <td><span class="status-badge status-${emp.role}">${roleInfo.label}</span></td>
                <td>${manager ? manager.name : '-'}</td>
                <td>${emp.email}</td>
                ${canManage ? `
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="EmployeeManager.editEmployee('${emp.id}')">Edit</button>
                    <button class="btn btn-sm btn-secondary" onclick="EmployeeManager.deleteEmployee('${emp.id}')">Delete</button>
                  </td>
                ` : ''}
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Render data management section
   */
  renderDataManagement() {
    const employees = DataModel.getAllEmployees();
    const attendance = DataModel.getAllAttendance();
    const canImport = DataModel.hasPermission('canImport');
    const canExport = DataModel.hasPermission('canExport');

    return `
      <div class="card-header">
        <h2 class="card-title">Data Management</h2>
      </div>
      <div style="padding: var(--spacing-lg);">
        <div class="flex gap-lg" style="margin-bottom: var(--spacing-lg);">
          <div class="card" style="flex: 1; text-align: center;">
            <h3 style="font-size: var(--font-size-3xl); color: var(--primary-color); margin-bottom: var(--spacing-sm);">
              ${employees.length}
            </h3>
            <p style="color: var(--text-secondary);">Registered Employees</p>
          </div>
          <div class="card" style="flex: 1; text-align: center;">
            <h3 style="font-size: var(--font-size-3xl); color: var(--primary-color); margin-bottom: var(--spacing-sm);">
              ${attendance.length}
            </h3>
            <p style="color: var(--text-secondary);">Attendance Records</p>
          </div>
        </div>

        ${canImport ? `
          <h3 style="margin-bottom: var(--spacing-md);">CSV Import</h3>
          <div style="margin-bottom: var(--spacing-xl);">
            <div class="flex gap-md" style="margin-bottom: var(--spacing-md);">
              <button class="btn btn-primary" onclick="EmployeeManager.showConcurImportModal()">
                📊 Import Concur CSV
              </button>
              <button class="btn btn-primary" onclick="EmployeeManager.showITrentImportModal()">
                📋 Import iTrent CSV
              </button>
            </div>
            <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">
              * Concur: Business trip data / iTrent: Leave data
            </p>
          </div>
        ` : ''}

        <h3 style="margin-bottom: var(--spacing-md);">Data Operations</h3>
        <div class="flex gap-md">
          ${canExport ? `
            <button class="btn btn-secondary" onclick="EmployeeManager.exportData()">
              Export Data (JSON)
            </button>
          ` : ''}
          ${canImport ? `
            <button class="btn btn-secondary" onclick="EmployeeManager.importData()">
              Import Data (JSON)
            </button>
            <button class="btn btn-secondary" onclick="EmployeeManager.clearData()">
              Clear All Data
            </button>
            <button class="btn btn-accent" onclick="DataModel.clearAllData(); SampleData.initializeSampleData(); EmployeeManager.render(); alert('Sample data regenerated');">
              Regenerate Sample Data
            </button>
          ` : ''}
        </div>
        
        <!-- Emergency reset button (no permission check) -->
        <div style="margin-top: var(--spacing-lg); padding-top: var(--spacing-lg); border-top: 1px solid var(--border-color);">
          <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-sm);">
            <strong>Emergency Reset:</strong> If you cannot access Manager functions, click below to reset all data and regenerate sample data with proper roles.
          </p>
          <button class="btn btn-accent" onclick="if(confirm('This will delete ALL data and regenerate sample data. Continue?')) { DataModel.clearAllData(); SampleData.initializeSampleData(); location.reload(); }">
            🔄 Reset & Regenerate All Data
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Show add modal
   */
  showAddModal() {
    if (!DataModel.hasPermission('canManageEmployees')) {
      alert('You do not have permission to add employees');
      return;
    }
    this.editingId = null;
    this.showModal();
  },

  /**
   * Edit employee
   */
  editEmployee(id) {
    if (!DataModel.hasPermission('canManageEmployees')) {
      alert('You do not have permission to edit employees');
      return;
    }
    this.editingId = id;
    this.showModal();
  },

  /**
   * Show modal
   */
  showModal() {
    const employee = this.editingId ? DataModel.getEmployeeById(this.editingId) : null;
    const locations = DataModel.getLocations();
    const positions = DataModel.getPositions();
    const managers = DataModel.getManagers();

    // Get departments for selected location
    const selectedLocation = employee ? employee.location : locations[0];
    const departments = DataModel.getDepartmentsByLocation(selectedLocation);

    const modalHtml = `
      <div class="modal-overlay" id="employee-modal" onclick="if(event.target === this) EmployeeManager.closeModal()">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">${this.editingId ? 'Edit Employee' : 'Add New Employee'}</h2>
            <button class="modal-close" onclick="EmployeeManager.closeModal()">×</button>
          </div>
          <div class="modal-body">
            <form id="employee-form" onsubmit="EmployeeManager.handleSubmit(event)">
              <div class="form-group">
                <label class="form-label">Employee ID *</label>
                <input type="text" class="form-input" id="emp-id" required 
                       value="${employee ? employee.id : ''}" 
                       ${this.editingId ? 'readonly' : ''}
                       placeholder="e.g., EMP001">
                <small style="color: var(--text-secondary);">Unique identifier for the employee</small>
              </div>

              <div class="form-group">
                <label class="form-label">Name *</label>
                <input type="text" class="form-input" id="emp-name" required 
                       value="${employee ? employee.name : ''}"
                       placeholder="e.g., John Smith">
              </div>

              <div class="flex gap-md">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label">Location *</label>
                  <select class="form-select" id="emp-location" required onchange="EmployeeManager.onLocationChange()">
                    ${locations.map(loc =>
      `<option value="${loc}" ${employee && employee.location === loc ? 'selected' : ''}>${loc}</option>`
    ).join('')}
                  </select>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label">Department *</label>
                  <select class="form-select" id="emp-department" required>
                    ${departments.map(dept =>
      `<option value="${dept}" ${employee && employee.department === dept ? 'selected' : ''}>${dept}</option>`
    ).join('')}
                  </select>
                </div>
              </div>

              <div class="flex gap-md">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label">Position *</label>
                  <select class="form-select" id="emp-position" required onchange="EmployeeManager.onPositionChange()">
                    ${Object.entries(positions).map(([key, pos]) =>
      `<option value="${key}" ${employee && employee.position === key ? 'selected' : ''}>${pos.label}</option>`
    ).join('')}
                  </select>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label">Role *</label>
                  <input type="text" class="form-input" id="emp-role" readonly 
                         value="${employee ? DataModel.getRoleInfo(employee.role).label : DataModel.getRoleInfo(DataModel.getRoleFromPosition('office_manager')).label}">
                  <small style="color: var(--text-secondary);">Auto-assigned based on position</small>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Manager</label>
                <select class="form-select" id="emp-manager">
                  <option value="">None</option>
                  ${managers.filter(m => m.id !== this.editingId).map(mgr =>
      `<option value="${mgr.id}" ${employee && employee.manager === mgr.id ? 'selected' : ''}>${mgr.name} (${mgr.id})</option>`
    ).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Email *</label>
                <input type="email" class="form-input" id="emp-email" required 
                       value="${employee ? employee.email : ''}"
                       placeholder="e.g., john.smith@company.com">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="EmployeeManager.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('employee-form').requestSubmit()">
              ${this.editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  /**
   * Handle location change
   */
  onLocationChange() {
    const location = document.getElementById('emp-location').value;
    const departments = DataModel.getDepartmentsByLocation(location);
    const deptSelect = document.getElementById('emp-department');

    deptSelect.innerHTML = departments.map(dept =>
      `<option value="${dept}">${dept}</option>`
    ).join('');
  },

  /**
   * Handle position change
   */
  onPositionChange() {
    const position = document.getElementById('emp-position').value;
    const role = DataModel.getRoleFromPosition(position);
    const roleInfo = DataModel.getRoleInfo(role);
    document.getElementById('emp-role').value = roleInfo.label;
  },

  /**
   * Close modal
   */
  closeModal() {
    const modal = document.getElementById('employee-modal');
    if (modal) modal.remove();
    this.editingId = null;
  },

  /**
   * Handle form submit
   */
  handleSubmit(event) {
    event.preventDefault();

    const id = document.getElementById('emp-id').value.trim();
    const name = document.getElementById('emp-name').value.trim();
    const location = document.getElementById('emp-location').value;
    const department = document.getElementById('emp-department').value;
    const position = document.getElementById('emp-position').value;
    const manager = document.getElementById('emp-manager').value || null;
    const email = document.getElementById('emp-email').value.trim();
    const role = DataModel.getRoleFromPosition(position);

    const data = {
      id,
      name,
      location,
      department,
      position,
      role,
      manager,
      email
    };

    try {
      if (this.editingId) {
        // Update
        delete data.id; // Don't allow ID change
        DataModel.updateEmployee(this.editingId, data);
        alert('Employee updated successfully');
      } else {
        // Add
        DataModel.addEmployee(data);
        alert('Employee added successfully');
      }

      this.closeModal();
      this.render();

      // Update other views
      if (window.CalendarView) CalendarView.render();
      if (window.ListView) ListView.render();
      if (window.InputForm) InputForm.render();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  },

  /**
   * Delete employee
   */
  deleteEmployee(id) {
    if (!DataModel.hasPermission('canManageEmployees')) {
      alert('You do not have permission to delete employees');
      return;
    }

    const employee = DataModel.getEmployeeById(id);
    if (!employee) return;

    if (!confirm(`Delete ${employee.name}?\nRelated attendance records will also be deleted.`)) return;

    DataModel.deleteEmployee(id);
    alert('Employee deleted');
    this.render();

    // Update other views
    if (window.CalendarView) CalendarView.render();
    if (window.ListView) ListView.render();
  },

  /**
   * Export data
   */
  exportData() {
    if (!DataModel.hasPermission('canExport')) {
      alert('You do not have permission to export data');
      return;
    }

    const data = DataModel.exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-data-${DataModel.formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Import data
   */
  importData() {
    if (!DataModel.hasPermission('canImport')) {
      alert('You do not have permission to import data');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (confirm('Overwrite existing data with imported data?')) {
            DataModel.importData(data);
            alert('Data imported successfully');
            this.render();
            if (window.CalendarView) CalendarView.render();
            if (window.ListView) ListView.render();
            if (window.InputForm) InputForm.render();
          }
        } catch (error) {
          alert('Failed to read JSON file: ' + error.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  /**
   * Clear all data
   */
  clearData() {
    if (!DataModel.hasPermission('canImport')) {
      alert('You do not have permission to clear data');
      return;
    }

    if (!confirm('Delete all data?\nThis action cannot be undone.')) return;
    if (!confirm('Are you sure?')) return;

    DataModel.clearAllData();
    alert('All data deleted');
    this.render();

    // Update other views
    if (window.CalendarView) CalendarView.render();
    if (window.ListView) ListView.render();
    if (window.InputForm) InputForm.render();
  },

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Additional event listeners if needed
  },

  /**
   * Show Concur CSV import modal
   */
  showConcurImportModal() {
    if (!DataModel.hasPermission('canImport')) {
      alert('You do not have permission to import data');
      return;
    }

    const locations = DataModel.getLocations();
    const employees = DataModel.getAllEmployees();

    const modalHtml = `
      <div class="modal-overlay" id="csv-import-modal" onclick="if(event.target === this) EmployeeManager.closeCSVModal()">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">📊 Import Concur CSV (Business Trip Data)</h2>
            <button class="modal-close" onclick="EmployeeManager.closeCSVModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Import Scope</label>
              <select class="form-select" id="csv-scope">
                <option value="all">All Employees</option>
                <option value="location">By Location</option>
                <option value="employee">Individual</option>
              </select>
            </div>

            <div class="form-group hidden" id="location-select-group">
              <label class="form-label">Location</label>
              <select class="form-select" id="csv-location">
                ${locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
              </select>
            </div>

            <div class="form-group hidden" id="employee-select-group">
              <label class="form-label">Employee</label>
              <select class="form-select" id="csv-employee">
                ${employees.map(emp => `<option value="${emp.id}">${emp.name} (${emp.location})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">CSV File</label>
              <input type="file" class="form-input" id="csv-file" accept=".csv">
              <small style="color: var(--text-secondary);">
                Format: Employee ID, Name, Start Date, End Date, Destination
              </small>
            </div>

            <div class="form-group">
              <button class="btn btn-secondary btn-sm" onclick="EmployeeManager.downloadSampleConcurCSV()">
                Download Sample CSV
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="EmployeeManager.closeCSVModal()">Cancel</button>
            <button class="btn btn-primary" onclick="EmployeeManager.processConcurImport()">
              Import
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Scope change event
    document.getElementById('csv-scope').addEventListener('change', (e) => {
      const scope = e.target.value;
      document.getElementById('location-select-group').classList.toggle('hidden', scope !== 'location');
      document.getElementById('employee-select-group').classList.toggle('hidden', scope !== 'employee');
    });
  },

  /**
   * Show iTrent CSV import modal
   */
  showITrentImportModal() {
    if (!DataModel.hasPermission('canImport')) {
      alert('You do not have permission to import data');
      return;
    }

    const locations = DataModel.getLocations();
    const employees = DataModel.getAllEmployees();

    const modalHtml = `
      <div class="modal-overlay" id="csv-import-modal" onclick="if(event.target === this) EmployeeManager.closeCSVModal()">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">📋 Import iTrent CSV (Leave Data)</h2>
            <button class="modal-close" onclick="EmployeeManager.closeCSVModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Import Scope</label>
              <select class="form-select" id="csv-scope">
                <option value="all">All Employees</option>
                <option value="location">By Location</option>
                <option value="employee">Individual</option>
              </select>
            </div>

            <div class="form-group hidden" id="location-select-group">
              <label class="form-label">Location</label>
              <select class="form-select" id="csv-location">
                ${locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
              </select>
            </div>

            <div class="form-group hidden" id="employee-select-group">
              <label class="form-label">Employee</label>
              <select class="form-select" id="csv-employee">
                ${employees.map(emp => `<option value="${emp.id}">${emp.name} (${emp.location})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">CSV File</label>
              <input type="file" class="form-input" id="csv-file" accept=".csv">
              <small style="color: var(--text-secondary);">
                Format: Employee ID, Name, Start Date, End Date, Leave Type, Remaining Days
              </small>
            </div>

            <div class="form-group">
              <button class="btn btn-secondary btn-sm" onclick="EmployeeManager.downloadSampleITrentCSV()">
                Download Sample CSV
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="EmployeeManager.closeCSVModal()">Cancel</button>
            <button class="btn btn-primary" onclick="EmployeeManager.processITrentImport()">
              Import
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Scope change event
    document.getElementById('csv-scope').addEventListener('change', (e) => {
      const scope = e.target.value;
      document.getElementById('location-select-group').classList.toggle('hidden', scope !== 'location');
      document.getElementById('employee-select-group').classList.toggle('hidden', scope !== 'employee');
    });
  },

  /**
   * Close CSV modal
   */
  closeCSVModal() {
    const modal = document.getElementById('csv-import-modal');
    if (modal) modal.remove();
  },

  /**
   * Process Concur import
   */
  processConcurImport() {
    const fileInput = document.getElementById('csv-file');
    const scope = document.getElementById('csv-scope').value;
    let scopeValue = null;

    if (scope === 'location') {
      scopeValue = document.getElementById('csv-location').value;
    } else if (scope === 'employee') {
      scopeValue = document.getElementById('csv-employee').value;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Please select a CSV file');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const csvText = e.target.result;
      const result = CSVImporter.importConcurCSV(csvText, scope, scopeValue);

      if (result.success) {
        let message = `Imported ${result.imported} business trip records`;
        if (result.errors.length > 0) {
          message += `\n\nWarnings/Errors:\n${result.errors.join('\n')}`;
        }
        alert(message);
        this.closeCSVModal();
        this.render();
        if (window.CalendarView) CalendarView.render();
        if (window.ListView) ListView.render();
      } else {
        alert(`Import failed:\n${result.errors.join('\n')}`);
      }
    };

    reader.readAsText(file);
  },

  /**
   * Process iTrent import
   */
  processITrentImport() {
    const fileInput = document.getElementById('csv-file');
    const scope = document.getElementById('csv-scope').value;
    let scopeValue = null;

    if (scope === 'location') {
      scopeValue = document.getElementById('csv-location').value;
    } else if (scope === 'employee') {
      scopeValue = document.getElementById('csv-employee').value;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Please select a CSV file');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const csvText = e.target.result;
      const result = CSVImporter.importITrentCSV(csvText, scope, scopeValue);

      if (result.success) {
        let message = `Imported ${result.imported} leave records`;
        if (result.errors.length > 0) {
          message += `\n\nWarnings/Errors:\n${result.errors.join('\n')}`;
        }
        alert(message);
        this.closeCSVModal();
        this.render();
        if (window.CalendarView) CalendarView.render();
        if (window.ListView) ListView.render();
      } else {
        alert(`Import failed:\n${result.errors.join('\n')}`);
      }
    };

    reader.readAsText(file);
  },

  /**
   * Download sample Concur CSV
   */
  downloadSampleConcurCSV() {
    const csv = CSVImporter.generateSampleConcurCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_concur.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Download sample iTrent CSV
   */
  downloadSampleITrentCSV() {
    const csv = CSVImporter.generateSampleITrentCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_itrent.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
};

// Export globally
window.EmployeeManager = EmployeeManager;
