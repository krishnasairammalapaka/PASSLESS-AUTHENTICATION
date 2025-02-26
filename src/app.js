const express = require('express');
const path = require('path');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Middleware
app.use(express.json());

// Serve static files from src directory
app.use(express.static(path.join(__dirname)));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Routes
app.use('/api/admin', adminRoutes);

// Serve admin dashboard
app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/views/dashboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin dashboard available at http://localhost:${PORT}/admin/dashboard`);
}); 