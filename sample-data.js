// ===================================
// Sample Data Generation
// ===================================

const SampleData = {
    /**
     * Generate sample employees
     */
    generateSampleEmployees() {
        return [
            // London (LDN)
            {
                id: 'EMP001',
                name: 'John Smith',
                location: 'LDN',
                department: 'Sales',
                position: 'gm',
                role: 'manager',
                manager: null,
                email: 'john.smith@company.com'
            },
            {
                id: 'EMP002',
                name: 'Sarah Johnson',
                location: 'LDN',
                department: 'Finance',
                position: 'office_manager',
                role: 'manager',
                manager: null,
                email: 'sarah.johnson@company.com'
            },
            {
                id: 'EMP003',
                name: 'Michael Brown',
                location: 'LDN',
                department: 'Sales',
                position: 'other',
                role: 'general',
                manager: 'EMP001',
                email: 'michael.brown@company.com'
            },

            // Düsseldorf (DSS)
            {
                id: 'EMP004',
                name: 'Anna Schmidt',
                location: 'DSS',
                department: 'Sales',
                position: 'dgm',
                role: 'manager',
                manager: null,
                email: 'anna.schmidt@company.com'
            },
            {
                id: 'EMP005',
                name: 'Thomas Müller',
                location: 'DSS',
                department: 'Operations',
                position: 'other',
                role: 'general',
                manager: 'EMP004',
                email: 'thomas.mueller@company.com'
            },

            // Hamburg (HBG)
            {
                id: 'EMP006',
                name: 'Emma Weber',
                location: 'HBG',
                department: 'IT',
                position: 'office_manager',
                role: 'manager',
                manager: null,
                email: 'emma.weber@company.com'
            },
            {
                id: 'EMP007',
                name: 'Lucas Fischer',
                location: 'HBG',
                department: 'IT',
                position: 'other',
                role: 'general',
                manager: 'EMP006',
                email: 'lucas.fischer@company.com'
            },

            // Paris (PRS)
            {
                id: 'EMP008',
                name: 'Sophie Martin',
                location: 'PRS',
                department: 'HR',
                position: 'gm',
                role: 'manager',
                manager: null,
                email: 'sophie.martin@company.com'
            },
            {
                id: 'EMP009',
                name: 'Pierre Dubois',
                location: 'PRS',
                department: 'Finance',
                position: 'other',
                role: 'general',
                manager: 'EMP008',
                email: 'pierre.dubois@company.com'
            },

            // Milan (MIL)
            {
                id: 'EMP010',
                name: 'Giulia Rossi',
                location: 'MIL',
                department: 'Sales',
                position: 'dgm',
                role: 'manager',
                manager: null,
                email: 'giulia.rossi@company.com'
            },
            {
                id: 'EMP011',
                name: 'Marco Bianchi',
                location: 'MIL',
                department: 'Operations',
                position: 'other',
                role: 'general',
                manager: 'EMP010',
                email: 'marco.bianchi@company.com'
            },

            // Additional employees
            {
                id: 'EMP012',
                name: 'Emily Davis',
                location: 'LDN',
                department: 'HR',
                position: 'other',
                role: 'general',
                manager: 'EMP002',
                email: 'emily.davis@company.com'
            },
            {
                id: 'EMP013',
                name: '佐藤太郎',
                location: 'LDN',
                department: 'Sales',
                position: 'gm',
                role: 'manager',
                manager: null,
                email: 'taro.sato@company.com'
            }
        ];
    },

    /**
     * Generate sample attendance records for current month
     */
    generateSampleAttendance() {
        const records = [];
        const employees = this.generateSampleEmployees();
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        // Get first and last day of current month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Status distribution
        const statusOptions = ['office', 'wfh', 'business_trip', 'out', 'vacation', 'sick'];
        const statusWeights = [0.5, 0.25, 0.1, 0.05, 0.08, 0.02]; // Probabilities

        employees.forEach(emp => {
            for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
                const dayOfWeek = date.getDay();

                // Skip weekends
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    continue;
                }

                // Skip future dates
                if (date > today) {
                    continue;
                }

                // Randomly select status based on weights
                const random = Math.random();
                let cumulative = 0;
                let status = 'office';

                for (let i = 0; i < statusOptions.length; i++) {
                    cumulative += statusWeights[i];
                    if (random < cumulative) {
                        status = statusOptions[i];
                        break;
                    }
                }

                // Generate appropriate note based on status
                let note = '';
                if (status === 'business_trip') {
                    const destinations = ['Tokyo', 'New York', 'Singapore', 'Dubai', 'Sydney'];
                    note = `Business trip to ${destinations[Math.floor(Math.random() * destinations.length)]}`;
                } else if (status === 'out') {
                    note = 'Client meeting';
                } else if (status === 'vacation') {
                    note = 'Annual leave';
                } else if (status === 'sick') {
                    note = 'Sick leave';
                }

                records.push({
                    employeeId: emp.id,
                    date: DataModel.formatDate(date),
                    status: status,
                    note: note
                });
            }
        });

        return records;
    },

    /**
     * Initialize sample data if no data exists
     */
    initializeSampleData() {
        const employees = DataModel.getAllEmployees();

        if (employees.length === 0) {
            // Add sample employees
            const sampleEmployees = this.generateSampleEmployees();
            sampleEmployees.forEach(emp => {
                try {
                    DataModel.addEmployee(emp);
                } catch (error) {
                    console.error('Error adding employee:', error);
                }
            });

            // Add sample attendance
            const sampleAttendance = this.generateSampleAttendance();
            sampleAttendance.forEach(att => {
                DataModel.addAttendance(att);
            });

            // Set first manager as current user for demo
            DataModel.setCurrentUser('EMP001');

            console.log('Sample data initialized successfully');
            return true;
        }

        return false;
    }
};

// Export globally
window.SampleData = SampleData;
