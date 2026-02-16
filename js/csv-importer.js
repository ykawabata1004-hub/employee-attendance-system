// ===================================
// CSV Import Functionality
// ===================================

const CSVImporter = {
    /**
     * Import Concur CSV
     * Expected format: Employee ID, Name, Start Date, End Date, Destination
     */
    importConcurCSV(csvText, scope = 'all', scopeValue = null) {
        try {
            const lines = csvText.trim().split('\n');
            if (lines.length < 2) {
                throw new Error('CSV file is empty');
            }

            // Skip header row
            const dataLines = lines.slice(1);
            const imported = [];
            const errors = [];

            dataLines.forEach((line, index) => {
                try {
                    const columns = this.parseCSVLine(line);

                    if (columns.length < 5) {
                        errors.push(`Row ${index + 2}: Insufficient columns`);
                        return;
                    }

                    const [employeeId, employeeName, startDate, endDate, destination] = columns;

                    // Scope check
                    if (!this.isInScope(employeeId, scope, scopeValue)) {
                        return; // Skip
                    }

                    // Check if employee exists
                    let employee = DataModel.getEmployeeById(employeeId);

                    if (!employee) {
                        errors.push(`Row ${index + 2}: Employee ID ${employeeId} not found`);
                        return;
                    }

                    // Register business trip data
                    const note = `Business trip to ${destination}`;
                    const records = DataModel.addAttendanceRange(
                        employeeId,
                        startDate,
                        endDate,
                        'business_trip',
                        note
                    );

                    imported.push(...records);
                } catch (error) {
                    errors.push(`Row ${index + 2}: ${error.message}`);
                }
            });

            return {
                success: true,
                imported: imported.length,
                errors: errors
            };
        } catch (error) {
            return {
                success: false,
                imported: 0,
                errors: [error.message]
            };
        }
    },

    /**
     * Import iTrent CSV
     * Expected format: Employee ID, Name, Start Date, End Date, Leave Type, Remaining Days
     */
    importITrentCSV(csvText, scope = 'all', scopeValue = null) {
        try {
            const lines = csvText.trim().split('\n');
            if (lines.length < 2) {
                throw new Error('CSV file is empty');
            }

            // Skip header row
            const dataLines = lines.slice(1);
            const imported = [];
            const errors = [];

            dataLines.forEach((line, index) => {
                try {
                    const columns = this.parseCSVLine(line);

                    if (columns.length < 6) {
                        errors.push(`Row ${index + 2}: Insufficient columns`);
                        return;
                    }

                    const [employeeId, employeeName, startDate, endDate, leaveType, remainingDays] = columns;

                    // Scope check
                    if (!this.isInScope(employeeId, scope, scopeValue)) {
                        return; // Skip
                    }

                    // Check if employee exists
                    let employee = DataModel.getEmployeeById(employeeId);

                    if (!employee) {
                        errors.push(`Row ${index + 2}: Employee ID ${employeeId} not found`);
                        return;
                    }

                    // Map leave type to status
                    let status = 'vacation';
                    let note = leaveType;

                    if (leaveType.includes('Sick') || leaveType.toLowerCase().includes('sick')) {
                        status = 'sick';
                        note = 'Sick leave';
                    } else {
                        note = `${leaveType} (${remainingDays} days remaining)`;
                    }

                    // Register leave data
                    const records = DataModel.addAttendanceRange(
                        employeeId,
                        startDate,
                        endDate,
                        status,
                        note
                    );

                    imported.push(...records);
                } catch (error) {
                    errors.push(`Row ${index + 2}: ${error.message}`);
                }
            });

            return {
                success: true,
                imported: imported.length,
                errors: errors
            };
        } catch (error) {
            return {
                success: false,
                imported: 0,
                errors: [error.message]
            };
        }
    },

    /**
     * Parse CSV line (comma-separated, double-quote aware)
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    },

    /**
     * Scope check
     */
    isInScope(employeeId, scope, scopeValue) {
        if (scope === 'all') {
            return true;
        }

        const employee = DataModel.getEmployeeById(employeeId);
        if (!employee) {
            return false;
        }

        if (scope === 'location') {
            return employee.location === scopeValue;
        }

        if (scope === 'employee') {
            return employee.id === scopeValue;
        }

        return true;
    },

    /**
     * Generate sample Concur CSV
     */
    generateSampleConcurCSV() {
        const lines = [
            'Employee ID,Name,Start Date,End Date,Destination',
            'EMP001,John Smith,2026-02-20,2026-02-22,Tokyo',
            'EMP002,Sarah Johnson,2026-02-25,2026-02-27,Paris',
            'EMP003,Michael Brown,2026-03-01,2026-03-03,London'
        ];
        return lines.join('\n');
    },

    /**
     * Generate sample iTrent CSV
     */
    generateSampleITrentCSV() {
        const lines = [
            'Employee ID,Name,Start Date,End Date,Leave Type,Remaining Days',
            'EMP004,Anna Schmidt,2026-02-18,2026-02-19,Annual Leave,15',
            'EMP005,Thomas Müller,2026-02-21,2026-02-21,Sick Leave,20',
            'EMP006,Emma Weber,2026-02-24,2026-02-26,Annual Leave,12'
        ];
        return lines.join('\n');
    }
};

// Export globally
window.CSVImporter = CSVImporter;
