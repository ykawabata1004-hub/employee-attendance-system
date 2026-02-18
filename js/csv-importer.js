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
                    destination: row.findIndex(h => h.includes('leg1 country') || h.includes('destination') || h.includes('location')),
                    purpose: row.findIndex(h => h.includes('request purpose') || h === 'purpose'),
                    country: row.findIndex(h => h.includes('leg1 country') || h === 'country')
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
                headerIndex = -1;
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
                    const purpose = (mapping.purpose !== -1 ? columns[mapping.purpose] : '').trim();
                    const country = (mapping.country !== -1 ? columns[mapping.country] : destination).trim();

                    if (!employeeId || employeeId.toLowerCase() === 'employee id' || !rawStartDate || !rawEndDate) {
                        return;
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

                        employee = DataModel.addEmployee({
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

                    // Register business trip data - ALWAYS use employee.id (canonical)
                    // Use purpose as note, and pass country as metadata
                    const records = DataModel.addAttendanceRange(
                        employee.id,
                        startDate,
                        endDate,
                        'business_trip',
                        purpose || `Business trip to ${destination}`,
                        { country: country }
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

        let cleanDate = dateStr.trim();

        // Handle YYYY/MM/DD or YYYY-MM-DD
        if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(cleanDate)) {
            return cleanDate.replace(/\//g, '-').split('-').map((v, i) => i > 0 ? v.padStart(2, '0') : v).join('-');
        }

        // Handle European DD/MM/YYYY or US MM/DD/YYYY
        // Concur often uses "M D, YYYY" or "D M, YYYY"
        const spaceMatch = cleanDate.match(/^(\d{1,2})\s+(\d{1,2})[,\s]+(\d{4})$/);
        if (spaceMatch) {
            let [_, p1, p2, y] = spaceMatch;
            let m, d;

            // Assume user's example (10 8, 2026 -> Oct 8) means MM DD order
            // But if p1 > 12, it must be DD MM
            if (parseInt(p1) > 12) {
                d = p1; m = p2;
            } else {
                m = p1; d = p2;
            }
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        const d = new Date(cleanDate);
        if (!isNaN(d.getTime())) {
            return DataModel.formatDate(d);
        }

        console.warn('Could not normalize date:', dateStr);
        return cleanDate;
    },

    /**
     * Import iTrent CSV
     */
    importITrentCSV(csvText, scope = 'all', scopeValue = null) {
        try {
            const lines = csvText.trim().split('\n');
            if (lines.length < 2) {
                throw new Error('CSV file is empty');
            }

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

                    const normalizedId = employeeId.trim().toLowerCase();
                    const normalizedValue = scopeValue ? scopeValue.trim().toLowerCase() : '';
                    if (scope === 'employee' && normalizedId !== normalizedValue) return;

                    let employee = DataModel.getEmployeeById(employeeId);
                    if (!employee) {
                        errors.push(`Row ${index + 2}: Employee ID ${employeeId} not found`);
                        return;
                    }

                    if (scope === 'location' && employee.location !== scopeValue) return;

                    let status = 'vacation';
                    let note = leaveType;
                    if (leaveType.includes('Sick') || leaveType.toLowerCase().includes('sick')) {
                        status = 'sick';
                        note = 'Sick leave';
                    } else {
                        note = `${leaveType} (${remainingDays} days remaining)`;
                    }

                    const records = DataModel.addAttendanceRange(
                        employee.id,
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
     * Parse CSV line
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

    generateSampleConcurCSV() {
        return 'Employee ID,Name,Start Date,End Date,Destination\nEMP001,John Smith,10 8, 2026,10 10, 2026,Tokyo';
    }
};

window.CSVImporter = CSVImporter;
