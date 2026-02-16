// ===================================
// Data Model & Local Storage Management
// ===================================

const DataModel = {
    // Local Storage Keys
    STORAGE_KEYS: {
        EMPLOYEES: 'attendance_employees',
        ATTENDANCE: 'attendance_records',
        SETTINGS: 'attendance_settings',
        CURRENT_USER: 'attendance_current_user'
    },

    // ===================================
    // Master Data
    // ===================================

    /**
     * Organization Master - Locations
     */
    LOCATIONS: ['LDN', 'DSS', 'HBG', 'PRS', 'MIL'],

    /**
     * Organization Master - Departments by Location
     */
    DEPARTMENTS: {
        'LDN': ['Sales', 'Finance', 'HR', 'IT', 'Operations'],
        'DSS': ['Sales', 'Finance', 'HR', 'Operations'],
        'HBG': ['Sales', 'Finance', 'IT', 'Operations'],
        'PRS': ['Sales', 'Finance', 'HR', 'IT'],
        'MIL': ['Sales', 'Finance', 'Operations']
    },

    /**
     * Position Master
     */
    POSITIONS: {
        'office_manager': { label: 'Office Manager', role: 'manager' },
        'gm': { label: 'GM', role: 'manager' },
        'dgm': { label: 'DGM', role: 'manager' },
        'other': { label: 'Other', role: 'general' }
    },

    /**
     * Role Master with Permissions
     */
    ROLES: {
        'manager': {
            label: 'Manager',
            permissions: {
                canView: true,
                canEdit: true,
                canDelete: true,
                canImport: true,
                canExport: true,
                canManageEmployees: true
            }
        },
        'general': {
            label: 'General',
            permissions: {
                canView: false,
                canEdit: false,
                canDelete: false,
                canImport: false,
                canExport: false,
                canManageEmployees: false
            }
        }
    },

    /**
     * Status Master
     */
    STATUSES: [
        { value: 'office', label: 'Office', color: '#4CAF50' },
        { value: 'wfh', label: 'Remote (WFH)', color: '#2196F3' },
        { value: 'business_trip', label: 'Business Trip', color: '#FF9800' },
        { value: 'out', label: 'Out', color: '#9C27B0' },
        { value: 'vacation', label: 'Vacation', color: '#F44336' },
        { value: 'sick', label: 'Sick Leave', color: '#607D8B' }
    ],

    // ===================================
    // Helper Functions for Master Data
    // ===================================

    /**
     * Get locations
     */
    getLocations() {
        return this.LOCATIONS;
    },

    /**
     * Get departments for a location
     */
    getDepartmentsByLocation(location) {
        return this.DEPARTMENTS[location] || [];
    },

    /**
     * Get all departments
     */
    getAllDepartments() {
        const allDepts = new Set();
        Object.values(this.DEPARTMENTS).forEach(depts => {
            depts.forEach(dept => allDepts.add(dept));
        });
        return Array.from(allDepts).sort();
    },

    /**
     * Get positions
     */
    getPositions() {
        return this.POSITIONS;
    },

    /**
     * Get position info
     */
    getPositionInfo(positionKey) {
        return this.POSITIONS[positionKey] || this.POSITIONS.other;
    },

    /**
     * Get role from position
     */
    getRoleFromPosition(positionKey) {
        const position = this.getPositionInfo(positionKey);
        return position.role;
    },

    /**
     * Get role info
     */
    getRoleInfo(roleKey) {
        return this.ROLES[roleKey] || this.ROLES.general;
    },

    /**
     * Get statuses
     */
    getStatuses() {
        return this.STATUSES;
    },

    /**
     * Get status info
     */
    getStatusInfo(statusValue) {
        return this.STATUSES.find(s => s.value === statusValue) || this.STATUSES[0];
    },

    // ===================================
    // Authentication & Authorization
    // ===================================

    /**
     * Get current user
     */
    getCurrentUser() {
        const userId = localStorage.getItem(this.STORAGE_KEYS.CURRENT_USER);
        if (userId) {
            return this.getEmployeeById(userId);
        }
        return null;
    },

    /**
     * Set current user
     */
    setCurrentUser(employeeId) {
        localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, employeeId);
    },

    /**
     * Logout current user
     */
    logout() {
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
    },

    /**
     * Check if current user has permission
     */
    hasPermission(action) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const roleInfo = this.getRoleInfo(user.role);
        return roleInfo.permissions[action] || false;
    },

    // ===================================
    // Employee Master Management
    // ===================================

    /**
     * Get all employees
     */
    getAllEmployees() {
        const data = localStorage.getItem(this.STORAGE_KEYS.EMPLOYEES);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Get employee by ID
     */
    getEmployeeById(id) {
        const employees = this.getAllEmployees();
        return employees.find(emp => emp.id === id);
    },

    /**
     * Check if employee ID exists
     */
    employeeIdExists(id) {
        return this.getEmployeeById(id) !== undefined;
    },

    /**
     * Add employee
     */
    addEmployee(employee) {
        // Validate employee ID is provided
        if (!employee.id) {
            throw new Error('Employee ID is required');
        }

        // Check if ID already exists
        if (this.employeeIdExists(employee.id)) {
            throw new Error('Employee ID already exists');
        }

        const employees = this.getAllEmployees();

        // Auto-assign role based on position if not provided
        if (!employee.role && employee.position) {
            employee.role = this.getRoleFromPosition(employee.position);
        }

        const newEmployee = {
            ...employee,
            createdAt: new Date().toISOString()
        };

        employees.push(newEmployee);
        localStorage.setItem(this.STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
        return newEmployee;
    },

    /**
     * Update employee
     */
    updateEmployee(id, updates) {
        const employees = this.getAllEmployees();
        const index = employees.findIndex(emp => emp.id === id);

        if (index !== -1) {
            // Auto-update role if position changed
            if (updates.position && !updates.role) {
                updates.role = this.getRoleFromPosition(updates.position);
            }

            employees[index] = {
                ...employees[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
            return employees[index];
        }
        return null;
    },

    /**
     * Delete employee
     */
    deleteEmployee(id) {
        const employees = this.getAllEmployees();
        const filtered = employees.filter(emp => emp.id !== id);
        localStorage.setItem(this.STORAGE_KEYS.EMPLOYEES, JSON.stringify(filtered));

        // Delete related attendance records
        const attendance = this.getAllAttendance();
        const filteredAttendance = attendance.filter(att => att.employeeId !== id);
        localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(filteredAttendance));

        return true;
    },

    /**
     * Get employees by location
     */
    getEmployeesByLocation(location) {
        const employees = this.getAllEmployees();
        return employees.filter(emp => emp.location === location);
    },

    /**
     * Get employees by department
     */
    getEmployeesByDepartment(department) {
        const employees = this.getAllEmployees();
        return employees.filter(emp => emp.department === department);
    },

    /**
     * Get employees by role
     */
    getEmployeesByRole(role) {
        const employees = this.getAllEmployees();
        return employees.filter(emp => emp.role === role);
    },

    /**
     * Get managers (for manager dropdown)
     */
    getManagers() {
        return this.getEmployeesByRole('manager');
    },

    // ===================================
    // Attendance Record Management
    // ===================================

    /**
     * Get all attendance records
     */
    getAllAttendance() {
        const data = localStorage.getItem(this.STORAGE_KEYS.ATTENDANCE);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Get attendance by ID
     */
    getAttendanceById(id) {
        const records = this.getAllAttendance();
        return records.find(att => att.id === id);
    },

    /**
     * Get attendance by employee and date
     */
    getAttendanceByEmployeeAndDate(employeeId, date) {
        const records = this.getAllAttendance();
        return records.find(att => att.employeeId === employeeId && att.date === date);
    },

    /**
     * Get attendance by date range
     */
    getAttendanceByDateRange(startDate, endDate) {
        const records = this.getAllAttendance();
        return records.filter(att => {
            return att.date >= startDate && att.date <= endDate;
        });
    },

    /**
     * Get attendance by employee
     */
    getAttendanceByEmployee(employeeId) {
        const records = this.getAllAttendance();
        return records.filter(att => att.employeeId === employeeId);
    },

    /**
     * Get attendance by date
     */
    getAttendanceByDate(date) {
        const records = this.getAllAttendance();
        return records.filter(att => att.date === date);
    },

    /**
     * Add attendance
     */
    addAttendance(attendance) {
        const records = this.getAllAttendance();

        // Check if same employee/date record exists
        const existing = this.getAttendanceByEmployeeAndDate(
            attendance.employeeId,
            attendance.date
        );

        if (existing) {
            // Update existing record
            return this.updateAttendance(existing.id, attendance);
        }

        const newRecord = {
            id: this.generateId('ATT'),
            ...attendance,
            createdAt: new Date().toISOString()
        };
        records.push(newRecord);
        localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
        return newRecord;
    },

    /**
     * Update attendance
     */
    updateAttendance(id, updates) {
        const records = this.getAllAttendance();
        const index = records.findIndex(att => att.id === id);
        if (index !== -1) {
            records[index] = {
                ...records[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
            return records[index];
        }
        return null;
    },

    /**
     * Delete attendance
     */
    deleteAttendance(id) {
        const records = this.getAllAttendance();
        const filtered = records.filter(att => att.id !== id);
        localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(filtered));
        return true;
    },

    /**
     * Add attendance range (bulk)
     */
    addAttendanceRange(employeeId, startDate, endDate, status, note = '') {
        const records = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = this.formatDate(date);
            const record = this.addAttendance({
                employeeId,
                date: dateStr,
                status,
                note
            });
            records.push(record);
        }

        return records;
    },

    // ===================================
    // Utility Functions
    // ===================================

    /**
     * Generate unique ID
     */
    generateId(prefix = 'ID') {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `${prefix}${timestamp}${random}`;
    },

    /**
     * Format date to YYYY-MM-DD
     */
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Export all data
     */
    exportData() {
        return {
            employees: this.getAllEmployees(),
            attendance: this.getAllAttendance(),
            exportedAt: new Date().toISOString()
        };
    },

    /**
     * Import data
     */
    importData(data) {
        if (data.employees) {
            localStorage.setItem(this.STORAGE_KEYS.EMPLOYEES, JSON.stringify(data.employees));
        }
        if (data.attendance) {
            localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(data.attendance));
        }
        return true;
    },

    /**
     * Clear all data
     */
    clearAllData() {
        localStorage.removeItem(this.STORAGE_KEYS.EMPLOYEES);
        localStorage.removeItem(this.STORAGE_KEYS.ATTENDANCE);
        localStorage.removeItem(this.STORAGE_KEYS.SETTINGS);
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
        return true;
    },

    /**
     * Get statistics
     */
    getStatistics(startDate, endDate) {
        const attendance = this.getAttendanceByDateRange(startDate, endDate);
        const stats = {
            total: attendance.length,
            byStatus: {}
        };

        this.getStatuses().forEach(status => {
            stats.byStatus[status.value] = {
                count: attendance.filter(att => att.status === status.value).length,
                label: status.label,
                color: status.color
            };
        });

        return stats;
    }
};

// Export globally
window.DataModel = DataModel;
