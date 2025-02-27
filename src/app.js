const express = require('express');
const path = require('path');
const session = require('express-session');
const adminRoutes = require('./routes/admin');

const app = express();

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if using https
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from src directory
app.use(express.static(path.join(__dirname)));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Mock admin authentication for testing
app.use((req, res, next) => {
    req.session.isAdmin = true; // This is temporary for testing
    next();
});

// Routes
app.use('/api/admin', adminRoutes);

// Serve admin dashboard
app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/views/dashboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Not found' 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin dashboard available at http://localhost:${PORT}/admin/dashboard`);
}); 