// ===================================
// Status Registration Form
// ===================================

const InputForm = {
  editingId: null,

  /**
   * Initialize form
   */
  init() {
    // Check permissions only if user is logged in
    const currentUser = DataModel.getCurrentUser();
    if (currentUser && !DataModel.hasPermission('canEdit')) {
      const container = document.getElementById('input-view');
      if (container) {
        container.innerHTML = `
                    <div class="card">
                        <div style="padding: var(--spacing-xl); text-align: center;">
                            <h2 style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">Access Denied</h2>
                            <p style="color: var(--text-secondary);">You do not have permission to register or edit attendance status.</p>
                            <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">Please contact your manager for access.</p>
                        </div>
                    </div>
                `;
      }
      return;
    }

    this.render();
    this.attachEventListeners();

  },

  /**
   * Render form
   */
  render() {
    const container = document.getElementById('input-view');
    if (!container) return;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Register Attendance Status</h2>
        </div>
        ${this.renderForm()}
      </div>
      <div class="card mt-lg">
        <div class="card-header">
          <h2 class="card-title">Recent Registrations</h2>
        </div>
        ${this.renderRecentRecords()}
      </div>
    `;
  },

  /**
   * Render input form
   */
  renderForm() {
    const employees = DataModel.getAllEmployees();
    const statuses = DataModel.getStatuses();
    const today = DataModel.formatDate(new Date());

    return `
      <form id="attendance-form" onsubmit="InputForm.handleSubmit(event)">
        <div class="form-group">
          <label class="form-label">Employee *</label>
          <select class="form-select" id="input-employee" required>
            <option value="">Please select</option>
            ${employees.map(emp =>
      `<option value="${emp.id}">${emp.name} (${emp.location} - ${emp.department})</option>`
    ).join('')}
          </select>
        </div>

        <div class="flex gap-md">
          <div class="form-group" style="flex: 1;">
            <label class="form-label">Start Date *</label>
            <input type="date" class="form-input" id="input-start-date" value="${today}" required>
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="form-label">End Date</label>
            <input type="date" class="form-input" id="input-end-date" value="${today}">
            <small style="color: var(--text-secondary);">* Only for date range registration</small>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Status *</label>
          <select class="form-select" id="input-status" required>
            ${statuses.map(status =>
      `<option value="${status.value}">${status.label}</option>`
    ).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Note</label>
          <textarea class="form-textarea" id="input-note" placeholder="Business trip destination, reason for absence, etc."></textarea>
        </div>

        <div class="flex gap-md">
          <button type="submit" class="btn btn-primary">
            ${this.editingId ? 'Update' : 'Register'}
          </button>
          ${this.editingId ? `
            <button type="button" class="btn btn-secondary" onclick="InputForm.cancelEdit()">
              Cancel
            </button>
          ` : ''}
          <button type="button" class="btn btn-secondary" onclick="InputForm.resetForm()">
            Clear
          </button>
        </div>
      </form>
    `;
  },

  /**
   * Render recent records
   */
  renderRecentRecords() {
    const records = DataModel.getAllAttendance()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    if (records.length === 0) {
      return '<p style="padding: var(--spacing-lg); text-align: center; color: var(--text-secondary);">No registration data</p>';
    }

    const canEdit = DataModel.hasPermission('canEdit');
    const canDelete = DataModel.hasPermission('canDelete');

    return `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee Name</th>
              <th>Status</th>
              <th>Note</th>
              ${canEdit || canDelete ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${records.map(record => {
      const employee = DataModel.getEmployeeById(record.employeeId);
      const statusInfo = DataModel.getStatusInfo(record.status);
      return `
                <tr>
                  <td>${record.date}</td>
                  <td>${employee ? employee.name : 'Unknown'}</td>
                  <td><span class="status-badge status-${record.status}">${statusInfo.label}</span></td>
                  <td>${record.note || '-'}</td>
                  ${canEdit || canDelete ? `
                    <td>
                      ${canEdit ? `<button class="btn btn-sm btn-secondary" onclick="InputForm.editRecord('${record.id}')">Edit</button>` : ''}
                      ${canDelete ? `<button class="btn btn-sm btn-secondary" onclick="InputForm.deleteRecord('${record.id}')">Delete</button>` : ''}
                    </td>
                  ` : ''}
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Handle form submit
   */
  handleSubmit(event) {
    event.preventDefault();

    const employeeId = document.getElementById('input-employee').value;
    const startDate = document.getElementById('input-start-date').value;
    const endDate = document.getElementById('input-end-date').value || startDate;
    const status = document.getElementById('input-status').value;
    const note = document.getElementById('input-note').value;

    if (this.editingId) {
      // Update
      DataModel.updateAttendance(this.editingId, {
        employeeId,
        date: startDate,
        status,
        note
      });
      this.editingId = null;
      alert('Attendance status updated successfully');
    } else {
      // New registration
      if (startDate === endDate) {
        // Single day registration
        DataModel.addAttendance({
          employeeId,
          date: startDate,
          status,
          note
        });
      } else {
        // Bulk registration for date range
        DataModel.addAttendanceRange(employeeId, startDate, endDate, status, note);
      }
      alert('Attendance status registered successfully');
    }

    this.resetForm();
    this.render();

    // Update calendar and list views
    if (window.CalendarView) CalendarView.render();
    if (window.ListView) ListView.render();
  },

  /**
   * Edit record
   */
  editRecord(id) {
    if (!DataModel.hasPermission('canEdit')) {
      alert('You do not have permission to edit attendance status');
      return;
    }

    const record = DataModel.getAttendanceById(id);
    if (!record) return;

    this.editingId = id;

    // Set form values
    setTimeout(() => {
      document.getElementById('input-employee').value = record.employeeId;
      document.getElementById('input-start-date').value = record.date;
      document.getElementById('input-end-date').value = record.date;
      document.getElementById('input-status').value = record.status;
      document.getElementById('input-note').value = record.note || '';
    }, 100);

    this.render();

    // Scroll to form
    document.getElementById('attendance-form').scrollIntoView({ behavior: 'smooth' });
  },

  /**
   * Delete record
   */
  deleteRecord(id) {
    if (!DataModel.hasPermission('canDelete')) {
      alert('You do not have permission to delete attendance status');
      return;
    }

    if (!confirm('Are you sure you want to delete this attendance status?')) return;

    DataModel.deleteAttendance(id);
    alert('Attendance status deleted successfully');
    this.render();

    // Update calendar and list views
    if (window.CalendarView) CalendarView.render();
    if (window.ListView) ListView.render();
  },

  /**
   * Cancel edit
   */
  cancelEdit() {
    this.editingId = null;
    this.resetForm();
    this.render();
  },

  /**
   * Reset form
   */
  resetForm() {
    const form = document.getElementById('attendance-form');
    if (form) form.reset();

    const today = DataModel.formatDate(new Date());
    const startDateInput = document.getElementById('input-start-date');
    const endDateInput = document.getElementById('input-end-date');
    if (startDateInput) startDateInput.value = today;
    if (endDateInput) endDateInput.value = today;

    this.editingId = null;
  },

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Additional event listeners if needed
  }
};

// Export globally
window.InputForm = InputForm;
