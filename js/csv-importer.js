// ===================================
// CSV Import Functionality
// ===================================

const CSVImporter = {
    /**
     * Import Concur CSV
     * Supports both comma and tab delimited formats, and dynamic column mapping.
     */
    importConcurCSV(csvText, scope = 'all', scopeValue = null) {
        try {
            const lines = csvText.trim().split(/\r?\n/);
            if (lines.length < 2) {
                throw new Error('CSV file is empty');
            }

            // Detect delimiter (tab or comma)
            const firstLine = lines[0];
            const delimiter = firstLine.includes('\t') ? '\t' : ',';

            // Parse headers and find column mapping
            const headers = this.parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
            const mapping = {
                employeeId: headers.findIndex(h => h.includes('employee id')),
                name: headers.findIndex(h => h === 'employee' || (h.includes('employee') && !h.includes('id'))),
                location: headers.findIndex(h => h === 'branch' || h === 'location' || h.includes('location')),
                startDate: headers.findIndex(h => h.includes('leg1 start') || h === 'start date'),
                endDate: headers.findIndex(h => h.includes('leg1 end') || h === 'end date'),
                destination: headers.findIndex(h => h.includes('leg1 country') || h.includes('destination') || h.includes('travel request name'))
            };

            // Basic validation of headers
            if (mapping.employeeId === -1 || (mapping.startDate === -1 && mapping.endDate === -1)) {
                // If mapping fails, try fallback to original simple format (0-4)
                if (delimiter === ',') {
                    mapping.employeeId = 0;
                    mapping.name = 1;
                    mapping.startDate = 2;
                    mapping.endDate = 3;
                    mapping.destination = 4;
                } else {
                    throw new Error('Could not identify required columns (Employee ID, Start Date, End Date)');
                }
            }

            const dataLines = lines.slice(1);
            const imported = [];
            const errors = [];
            let autoCreatedCount = 0;

            dataLines.forEach((line, index) => {
                if (!line.trim()) return;

                try {
                    const columns = this.parseCSVLine(line, delimiter);

                    const employeeId = columns[mapping.employeeId];
                    const employeeName = mapping.name !== -1 ? columns[mapping.name] : 'New Employee';
                    let employeeLocation = mapping.location !== -1 ? columns[mapping.location] : 'LDN';
                    const rawStartDate = mapping.startDate !== -1 ? columns[mapping.startDate] : '';
                    const rawEndDate = mapping.endDate !== -1 ? columns[mapping.endDate] : '';
                    const destination = mapping.destination !== -1 ? columns[mapping.destination] : 'Unknown';

                    if (!employeeId || !rawStartDate || !rawEndDate) {
                        errors.push(`Row ${index + 2}: Missing required info (ID/Dates)`);
                        return;
                    }

                    // Normalize dates
                    const startDate = this.normalizeDate(rawStartDate);
                    const endDate = this.normalizeDate(rawEndDate);

                    // Scope check
                    if (!this.isInScope(employeeId, scope, scopeValue)) {
                        return;
                    }

                    // Check if employee exists, if not, create one
                    let employee = DataModel.getEmployeeById(employeeId);
                    if (!employee) {
                        // Validate and sanitize location
                        const validLocations = DataModel.getLocations();
                        if (!validLocations.includes(employeeLocation)) {
                            employeeLocation = validLocations[0]; // Default to first location if invalid
                        }

                        // Create new employee
                        DataModel.addEmployee({
                            id: employeeId,
                            name: employeeName,
                            location: employeeLocation,
                            department: 'Operations', // Default
                            position: 'other',
                            role: 'general',
                            email: `${employeeId.toLowerCase()}@company.com`
                        });
                        autoCreatedCount++;
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
                autoCreated: autoCreatedCount,
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
     * Normalize various date formats to YYYY-MM-DD
     */
    normalizeDate(dateStr) {
        if (!dateStr) return '';

        // Clean string
        let cleanDate = dateStr.trim();

        // Handle YYYY/MM/DD or YYYY-MM-DD
        if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(cleanDate)) {
            return cleanDate.replace(/\//g, '-').split('-').map((v, i) => i > 0 ? v.padStart(2, '0') : v).join('-');
        }

        // Handle "Month Day, Year" or "Month Day Year" (e.g., "10 8, 2026" or "Oct 8, 2026")
        // Special case for "10 8, 2026" which might not be parsed correctly by new Date() in all environments
        const monthDayYearMatch = cleanDate.match(/^(\d{1,2})\s+(\d{1,2})[,\s]+(\d{4})$/);
        if (monthDayYearMatch) {
            const [_, m, d, y] = monthDayYearMatch;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        const d = new Date(cleanDate);
        if (!isNaN(d.getTime())) {
            return DataModel.formatDate(d);
        }

        console.warn('Could not normalize date:', dateStr);
        return cleanDate; // Fallback
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
     * Parse CSV line (delimiter-separated, double-quote aware)
     */
    parseCSVLine(line, delimiter = ',') {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
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
