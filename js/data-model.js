// ===================================
// Data Model & Local Storage Management
// ===================================

const DataModel = {
    // Local Storage Keys
    STORAGE_KEYS: {
        EMPLOYEES: 'attendance_employees',
        ATTENDANCE: 'attendance_records',
        SETTINGS: 'attendance_settings',
        CURRENT_USER: 'attendance_current_user',
        USE_FIREBASE: 'attendance_use_firebase'
    },

    // Firebase state
    useFirebase: true,
    isInitialized: false,

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
    // Firebase Initialization & Sync
    // ===================================

    /**
     * Initialize DataModel (Sync with Firebase)
     */
    async init() {
        if (!this.useFirebase || typeof firebase === 'undefined') {
            this.isInitialized = true;
            return;
        }

        console.log('Synchronizing with Firebase...');

        try {
            // Initial fetch
            const employees = await FirebaseAdapter.getAllEmployees();
            const attendance = await FirebaseAdapter.getAllAttendance();
            const currentUser = await FirebaseAdapter.getCurrentUser();

            // Store in localStorage (cache)
            if (employees.length > 0) localStorage.setItem(this.STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
            if (attendance.length > 0) localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
            if (currentUser) localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, currentUser);

            // Set up listeners for real-time updates
            FirebaseAdapter.onEmployeesChanged((data) => {
                localStorage.setItem(this.STORAGE_KEYS.EMPLOYEES, JSON.stringify(data));
                // Notify UI if needed (simple reload or re-render)
                if (window.App && this.isInitialized) {
                    // Optimized re-render could go here
                }
            });

            FirebaseAdapter.onAttendanceChanged((data) => {
                localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(data));
                if (window.App && this.isInitialized) {
                    // Optimized re-render could go here
                }
            });

            this.isInitialized = true;
            console.log('Firebase sync completed');
        } catch (error) {
            console.error('Firebase sync failed, falling back to local storage:', error);
            this.isInitialized = true;
        }
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
        if (this.useFirebase) {
            FirebaseAdapter.setCurrentUser(employeeId);
        }
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
        if (!id) return null;
        const employees = this.getAllEmployees();
        const searchId = id.toString().trim().toLowerCase();
        return employees.find(emp => emp.id.toString().trim().toLowerCase() === searchId);
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

        if (this.useFirebase) {
            FirebaseAdapter.addEmployee(newEmployee);
        }

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

            if (this.useFirebase) {
                FirebaseAdapter.updateEmployee(id, updates);
            }

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

        if (this.useFirebase) {
            FirebaseAdapter.deleteEmployee(id);
            // Related attendance deletion is handled by filtering locally, 
            // but in Firebase we might need to delete them explicitly or handle via cloud functions.
            // For simplicity, we'll assume the client manages it or we leave orphaned records for now.
        }

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
        const normId = employeeId.toString().trim().toLowerCase();
        return records.find(att => att.employeeId.toString().trim().toLowerCase() === normId && att.date === date);
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

        // Normalize employeeId to canonical ID from master
        const employee = this.getEmployeeById(attendance.employeeId);
        const canonicalId = employee ? employee.id : attendance.employeeId;

        // Check if same employee/date record exists
        const existing = this.getAttendanceByEmployeeAndDate(
            canonicalId,
            attendance.date
        );

        if (existing) {
            return this.updateAttendance(existing.id, { ...attendance, employeeId: canonicalId });
        }

        const newRecord = {
            id: this.generateId('ATT'),
            ...attendance,
            employeeId: canonicalId,
            createdAt: new Date().toISOString()
        };
        records.push(newRecord);
        localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));

        if (this.useFirebase) {
            FirebaseAdapter.addAttendance(newRecord);
        }

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
    addAttendanceRange(employeeId, startDate, endDate, status, note = '', meta = {}) {
        const records = [];

        // Safety: Parse YYYY-MM-DD string to local date without timezone shifts
        const parseLocal = (s) => {
            const [y, m, d] = s.split('-').map(Number);
            return new Date(y, m - 1, d);
        };

        const start = parseLocal(startDate);
        const end = parseLocal(endDate);

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = this.formatDate(date);
            const record = this.addAttendance({
                employeeId,
                date: dateStr,
                status,
                note,
                ...meta
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
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date.substring(0, 10);
        }
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

        if (this.useFirebase) {
            FirebaseAdapter.clearAllData();
        }

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
