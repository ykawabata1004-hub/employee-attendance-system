# Employee Attendance System

Employee Attendance Management System with Role-based Access Control for European locations (London, Düsseldorf, Hamburg, Paris, Milan).

## Features

- 📅 **Calendar View** - Monthly, weekly, and daily attendance calendar
- 📋 **List & Search** - Filter and search employee attendance records
- ✏️ **Status Registration** - Register attendance status with date ranges
- 👥 **Employee Management** - Manage employee master data
- 🔐 **Role-based Access Control** - Manager and General user roles
- 📊 **CSV Import** - Import from Concur and iTrent systems
- 🌍 **Multi-location Support** - LDN, DSS, HBG, PRS, MIL

## Technology Stack

- **Frontend**: Pure HTML, CSS, JavaScript (No frameworks)
- **Storage**: localStorage (can be migrated to Firebase)
- **UI**: Modern, responsive design with glassmorphism effects

## Quick Start

1. Clone this repository
2. Open `index.html` in a web browser
3. Sample data will be automatically generated

## User Roles

### Manager
- Full access to all features
- Can add, edit, and delete employees
- Can import/export data
- Can manage attendance records

### General
- View-only access
- Cannot modify data

## Sample Users

After initial load, you can switch between users in the header dropdown:

**Managers:**
- John Smith (GM)
- Sarah Johnson (Office Manager)
- Anna Schmidt (DGM)
- Emma Weber (Office Manager)
- Sophie Martin (GM)
- Giulia Rossi (DGM)
- 佐藤太郎 (GM)

**General Users:**
- Michael Brown
- Thomas Müller
- Lucas Fischer
- Pierre Dubois
- Marco Bianchi
- Emily Davis

## Project Structure

```
employee-attendance-calendar/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # Application styles
├── js/
│   ├── app.js            # Main application controller
│   ├── data-model.js     # Data management and storage
│   ├── calendar-view.js  # Calendar view component
│   ├── list-view.js      # List and search view
│   ├── input-form.js     # Status registration form
│   ├── employee-manager.js # Employee management
│   ├── csv-importer.js   # CSV import functionality
│   └── sample-data.js    # Sample data generation
└── README.md             # This file
```

## Data Model

### Employee
- Employee ID (Primary Key)
- Name
- Location (LDN/DSS/HBG/PRS/MIL)
- Department
- Position (Office Manager/GM/DGM/Other)
- Role (Manager/General)
- Manager (Employee ID)
- Email

### Attendance
- Date
- Employee ID
- Status (Office/WFH/Business Trip/Out/Vacation/Sick)
- Note

## Deployment

### GitHub Pages

1. Create a new repository on GitHub
2. Push this code to the repository
3. Enable GitHub Pages in repository settings
4. Access via `https://YOUR_USERNAME.github.io/REPO_NAME/`

### Firebase Integration

See [Deployment Guide](deployment_guide.md) for detailed instructions on:
- Setting up Firebase Realtime Database
- Migrating from localStorage to Firebase
- Implementing Firebase Authentication

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Edge
- Safari

## License

MIT License

## Author

Created with ❤️ for employee attendance management
