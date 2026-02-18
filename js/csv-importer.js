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
            const lines = csvText.split(/\r?\n/).filter(line => line.trim());
            if (lines.length < 2) {
                throw new Error('CSV file is empty');
            }

            // Detect delimiter more reliably: count occurrences in the first few lines
            const sampleText = lines.slice(0, 10).join('\n');
            const tabCount = (sampleText.match(/\t/g) || []).length;
            const commaCount = (sampleText.match(/,/g) || []).length;
            const delimiter = tabCount > commaCount ? '\t' : ',';

            console.log(`Detected delimiter: ${delimiter === '\t' ? 'TAB' : 'COMMA'}`);

            // Find header row (search for keywords in all lines)
            let headerIndex = -1;
            let mapping = {};

            for (let i = 0; i < Math.min(lines.length, 30); i++) { // Search up to first 30 lines
                const row = this.parseCSVLine(lines[i], delimiter).map(h => h.trim().toLowerCase());
                const potentialMapping = {
                    employeeId: row.findIndex(h => h.includes('employee id') || h === 'id'),
                    name: row.findIndex(h => h === 'employee' || h.includes('employee name') || (h.includes('employee') && !h.includes('id'))),
                    location: row.findIndex(h => h === 'branch' || h === 'location' || h.includes('location')),
                    startDate: row.findIndex(h => h.includes('leg1 start') || h === 'start date' || h.includes('start date')),
                    endDate: row.findIndex(h => h.includes('leg1 end') || h === 'end date' || h.includes('end date')),
                    destination: row.findIndex(h => h.includes('leg1 country') || h.includes('destination') || h.includes('travel request name') || h.includes('location'))
                };

                // Score this row as a potential header
                let score = 0;
                if (potentialMapping.employeeId !== -1) score += 2;
                if (potentialMapping.startDate !== -1) score += 1;
                if (potentialMapping.endDate !== -1) score += 1;
                if (potentialMapping.name !== -1) score += 1;

                if (score >= 3) {
                    headerIndex = i;
                    mapping = potentialMapping;
                    console.log(`Header found at line ${i + 1} with mapping:`, mapping);
                    break;
                }
            }

            // Fallback for simple format if no header found
            if (headerIndex === -1) {
                console.warn('Header row not detected. Using fallback mapping.');
                mapping = { employeeId: 0, name: 1, location: -1, startDate: 2, endDate: 3, destination: 4 };
                headerIndex = -1; // Assume missing header, start from line 0
            }

            const dataLines = lines.slice(headerIndex + 1);
            const imported = [];
            const errors = [];
            let autoCreatedCount = 0;

            const normalizedScopeValue = scopeValue ? scopeValue.trim().toLowerCase() : '';

            dataLines.forEach((line, index) => {
                try {
                    const columns = this.parseCSVLine(line, delimiter);
                    if (columns.length < 2) return;

                    const employeeId = (columns[mapping.employeeId] || '').trim();
                    const employeeName = mapping.name !== -1 ? (columns[mapping.name] || 'New Employee').trim() : 'New Employee';
                    let employeeLocation = mapping.location !== -1 ? (columns[mapping.location] || 'LDN').trim() : 'LDN';
                    const rawStartDate = (mapping.startDate !== -1 ? columns[mapping.startDate] : '').trim();
                    const rawEndDate = (mapping.endDate !== -1 ? columns[mapping.endDate] : '').trim();
                    const destination = (mapping.destination !== -1 ? columns[mapping.destination] : 'Unknown').trim();

                    if (!employeeId || employeeId.toLowerCase() === 'employee id' || !rawStartDate || !rawEndDate) {
                        return; // Skip empty rows or duplicate headers
                    }

                    // Scope check (Robust comparison)
                    if (scope === 'employee') {
                        if (employeeId.toLowerCase() !== normalizedScopeValue) return;
                    }

                    // Normalize dates
                    const startDate = this.normalizeDate(rawStartDate);
                    const endDate = this.normalizeDate(rawEndDate);

                    // Scope check for location
                    if (scope === 'location') {
                        const emp = DataModel.getEmployeeById(employeeId);
                        if (!emp || emp.location !== scopeValue) return;
                    }

                    // Check if employee exists, if not, create one
                    let employee = DataModel.getEmployeeById(employeeId);
                    if (!employee) {
                        const validLocations = DataModel.getLocations();
                        if (!validLocations.includes(employeeLocation)) {
                            employeeLocation = validLocations[0];
                        }

                        DataModel.addEmployee({
                            id: employeeId,
                            name: employeeName,
                            location: employeeLocation,
                            department: 'Operations',
                            position: 'other',
                            role: 'general',
                            email: `${employeeId.toLowerCase()}@company.com`
                        });
                        autoCreatedCount++;
                    }

                    // Register business trip data
                    const records = DataModel.addAttendanceRange(
                        employeeId,
                        startDate,
                        endDate,
                        'business_trip',
                        `Business trip to ${destination}`
                    );

                    imported.push(...records);
                } catch (error) {
                    errors.push(`Row ${index + headerIndex + 2}: ${error.message}`);
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

                    // Scope check (Simplified for iTrent)
                    const normalizedId = employeeId.trim().toLowerCase();
                    const normalizedValue = scopeValue ? scopeValue.trim().toLowerCase() : '';
                    if (scope === 'employee' && normalizedId !== normalizedValue) return;

                    // Check if employee exists
                    let employee = DataModel.getEmployeeById(employeeId);

                    if (!employee) {
                        errors.push(`Row ${index + 2}: Employee ID ${employeeId} not found`);
                        return;
                    }

                    if (scope === 'location' && employee.location !== scopeValue) return;

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
        let curVal = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(curVal);
                curVal = '';
            } else {
                curVal += char;
            }
        }
        result.push(curVal);
        return result;
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
