// ===================================
// Firebase Database Adapter
// ===================================

const FirebaseAdapter = {
    db: null,
    isInitialized: false,

    /**
     * Initialize Firebase Database
     */
    init() {
        try {
            this.db = firebase.database();
            this.isInitialized = true;
            console.log('FirebaseAdapter initialized');
        } catch (error) {
            console.error('FirebaseAdapter initialization error:', error);
            this.isInitialized = false;
        }
    },

    /**
     * Get reference to a path
     */
    ref(path) {
        return this.db.ref(path);
    },

    // ===================================
    // Employee Operations
    // ===================================

    /**
     * Get all employees
     */
    async getAllEmployees() {
        try {
            const snapshot = await this.ref('employees').once('value');
            const data = snapshot.val();
            return data ? Object.values(data) : [];
        } catch (error) {
            console.error('Error getting employees:', error);
            return [];
        }
    },

    /**
     * Get employee by ID
     */
    async getEmployeeById(id) {
        try {
            const snapshot = await this.ref(`employees/${id}`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting employee:', error);
            return null;
        }
    },

    /**
     * Add employee
     */
    async addEmployee(employee) {
        try {
            await this.ref(`employees/${employee.id}`).set({
                ...employee,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return employee;
        } catch (error) {
            console.error('Error adding employee:', error);
            throw error;
        }
    },

    /**
     * Update employee
     */
    async updateEmployee(id, updates) {
        try {
            await this.ref(`employees/${id}`).update({
                ...updates,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { id, ...updates };
        } catch (error) {
            console.error('Error updating employee:', error);
            throw error;
        }
    },

    /**
     * Delete employee
     */
    async deleteEmployee(id) {
        try {
            await this.ref(`employees/${id}`).remove();
        } catch (error) {
            console.error('Error deleting employee:', error);
            throw error;
        }
    },

    // ===================================
    // Attendance Operations
    // ===================================

    /**
     * Get all attendance records
     */
    async getAllAttendance() {
        try {
            const snapshot = await this.ref('attendance').once('value');
            const data = snapshot.val();
            return data ? Object.values(data) : [];
        } catch (error) {
            console.error('Error getting attendance:', error);
            return [];
        }
    },

    /**
     * Get attendance by date range
     */
    async getAttendanceByDateRange(startDate, endDate) {
        try {
            const snapshot = await this.ref('attendance')
                .orderByChild('date')
                .startAt(startDate)
                .endAt(endDate)
                .once('value');
            const data = snapshot.val();
            return data ? Object.values(data) : [];
        } catch (error) {
            console.error('Error getting attendance by date range:', error);
            return [];
        }
    },

    /**
     * Get attendance by employee
     */
    async getAttendanceByEmployee(employeeId) {
        try {
            const snapshot = await this.ref('attendance')
                .orderByChild('employeeId')
                .equalTo(employeeId)
                .once('value');
            const data = snapshot.val();
            return data ? Object.values(data) : [];
        } catch (error) {
            console.error('Error getting attendance by employee:', error);
            return [];
        }
    },

    /**
     * Add attendance
     */
    async addAttendance(attendance) {
        try {
            const id = this.ref('attendance').push().key;
            await this.ref(`attendance/${id}`).set({
                ...attendance,
                id,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { id, ...attendance };
        } catch (error) {
            console.error('Error adding attendance:', error);
            throw error;
        }
    },

    /**
     * Update attendance
     */
    async updateAttendance(id, updates) {
        try {
            await this.ref(`attendance/${id}`).update({
                ...updates,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { id, ...updates };
        } catch (error) {
            console.error('Error updating attendance:', error);
            throw error;
        }
    },

    /**
     * Delete attendance
     */
    async deleteAttendance(id) {
        try {
            await this.ref(`attendance/${id}`).remove();
        } catch (error) {
            console.error('Error deleting attendance:', error);
            throw error;
        }
    },

    // ===================================
    // Current User Operations
    // ===================================

    /**
     * Set current user
     */
    async setCurrentUser(userId) {
        try {
            await this.ref('currentUser').set(userId);
        } catch (error) {
            console.error('Error setting current user:', error);
        }
    },

    /**
     * Get current user
     */
    async getCurrentUser() {
        try {
            const snapshot = await this.ref('currentUser').once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    /**
     * Clear all data
     */
    async clearAllData() {
        try {
            await this.ref('employees').remove();
            await this.ref('attendance').remove();
            await this.ref('currentUser').remove();
            console.log('All data cleared from Firebase');
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    },

    // ===================================
    // Real-time Listeners
    // ===================================

    /**
     * Listen to employee changes
     */
    onEmployeesChanged(callback) {
        this.ref('employees').on('value', (snapshot) => {
            const data = snapshot.val();
            callback(data ? Object.values(data) : []);
        });
    },

    /**
     * Listen to attendance changes
     */
    onAttendanceChanged(callback) {
        this.ref('attendance').on('value', (snapshot) => {
            const data = snapshot.val();
            callback(data ? Object.values(data) : []);
        });
    },

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.ref('employees').off();
        this.ref('attendance').off();
        this.ref('currentUser').off();
    }
};

// Export globally
window.FirebaseAdapter = FirebaseAdapter;

// Auto-initialize when Firebase is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        FirebaseAdapter.init();
    }
});
