const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const { authenticator } = require('otplib');
const session = require('express-session');
const WebSocketServer = require('./websocket/server');

// Configure TOTP settings
authenticator.options = {
    window: 1,        // Allow 1 step before/after current time
    step: 30,         // 30-second step
    digits: 6         // 6-digit code
};

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer(server);

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));

// Add session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Update WebSocket URL in client files
app.use((req, res, next) => {
    if (req.url.endsWith('.html')) {
        res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com");
    }
    next();
});

// Function to load users and admins from JSON files
async function loadUsers() {
    try {
        const [usersData, adminsData] = await Promise.all([
            fs.readFile(path.join(__dirname, 'data/users.json'), 'utf8'),
            fs.readFile(path.join(__dirname, 'data/admins.json'), 'utf8')
        ]);

        const users = JSON.parse(usersData).users;
        const admins = JSON.parse(adminsData).admins;

        return [...users, ...admins];
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
}

// Verify TOTP function
function verifyTOTP(secret, token) {
    try {
        return authenticator.verify({ token, secret });
    } catch (error) {
        console.error('TOTP verification error:', error);
        return false;
    }
}

// Update Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.authenticated || !req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth/views/login.html'));
});

// Auth routes
app.get('/auth/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth/views/login.html'));
});

// Update login route to use email from JSON files
app.post('/auth/login', async (req, res) => {
    try {
        const { username } = req.body;
        const allUsers = await loadUsers();
        
        // Find user by email
        const user = allUsers.find(u => u.email === username);

        if (user) {
            res.json({
                success: true,
                role: user.role,
                redirect: `/auth/verify-totp?username=${encodeURIComponent(username)}`
            });
        } else {
            res.json({
                success: false,
                message: 'Invalid email address'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});

app.get('/auth/verify-totp', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth/views/verify-totp.html'));
});

app.post('/auth/verify', async (req, res) => {
    try {
        const { username, code } = req.body;
        const allUsers = await loadUsers();
        const user = allUsers.find(u => u.email === username);

        if (!user) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Verify TOTP using the user's secret
        const isValidToken = verifyTOTP(user.secret, code);

        if (isValidToken) {
            // Update last login time
            const userType = user.role === 'admin' || user.role === 'superadmin' ? 'admins' : 'users';
            const filePath = path.join(__dirname, `data/${userType}.json`);
            
            const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            const userIndex = fileData[userType].findIndex(u => u.email === username);
            
            if (userIndex !== -1) {
                fileData[userType][userIndex].lastLogin = new Date().toISOString();
                await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));
            }

            // Set session data
            req.session.authenticated = true;
            req.session.user = {
                email: user.email,
                role: user.role
            };

            res.json({
                success: true,
                role: user.role,
                redirect: user.role === 'admin' || user.role === 'superadmin' 
                    ? '/admin/dashboard' 
                    : '/user/dashboard'
            });
        } else {
            res.json({
                success: false,
                message: 'Invalid verification code'
            });
        }
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during verification'
        });
    }
});

// Update protected routes to check role
app.get('/admin/dashboard', requireAuth, (req, res, next) => {
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
        return res.redirect('/user/dashboard');
    }
    res.sendFile(path.join(__dirname, 'admin/views/dashboard.html'));
});

app.get('/user/dashboard', requireAuth, (req, res, next) => {
    if (req.session.user.role === 'admin' || req.session.user.role === 'superadmin') {
        return res.redirect('/admin/dashboard');
    }
    res.sendFile(path.join(__dirname, 'user/views/dashboard.html'));
});

// Update logout route
app.get('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/auth/login');
    });
});

// Add these API endpoints after your existing routes and before error handling

// API endpoint to fetch users and admins
app.get('/api/admin/users', requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        const [usersData, adminsData] = await Promise.all([
            fs.readFile(path.join(__dirname, 'data/users.json'), 'utf8'),
            fs.readFile(path.join(__dirname, 'data/admins.json'), 'utf8')
        ]);

        const users = JSON.parse(usersData);
        const admins = JSON.parse(adminsData);

        res.json({
            success: true,
            users: users.users,
            admins: admins.admins
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch users' 
        });
    }
});

// API endpoint to update user
app.put('/api/users/:email', requireAuth, async (req, res) => {
    try {
        const { email } = req.params;
        const updates = req.body;
        
        // Load users and admins
        const [usersData, adminsData] = await Promise.all([
            fs.readFile(path.join(__dirname, 'data/users.json'), 'utf8'),
            fs.readFile(path.join(__dirname, 'data/admins.json'), 'utf8')
        ]);

        let users = JSON.parse(usersData);
        let admins = JSON.parse(adminsData);

        // Find and update user
        let userFound = false;
        let isAdmin = false;

        // Check in users
        const userIndex = users.users.findIndex(u => u.email === email);
        if (userIndex !== -1) {
            users.users[userIndex] = { ...users.users[userIndex], ...updates };
            userFound = true;
            await fs.writeFile(
                path.join(__dirname, 'data/users.json'), 
                JSON.stringify(users, null, 2)
            );
        }

        // Check in admins
        const adminIndex = admins.admins.findIndex(a => a.email === email);
        if (adminIndex !== -1) {
            admins.admins[adminIndex] = { ...admins.admins[adminIndex], ...updates };
            userFound = true;
            isAdmin = true;
            await fs.writeFile(
                path.join(__dirname, 'data/admins.json'), 
                JSON.stringify(admins, null, 2)
            );
        }

        if (!userFound) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'User updated successfully',
            isAdmin
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update user' 
        });
    }
});

// API endpoint to delete user
app.delete('/api/users/:email', requireAuth, async (req, res) => {
    try {
        if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        const { email } = req.params;
        
        const [usersData, adminsData] = await Promise.all([
            fs.readFile(path.join(__dirname, 'data/users.json'), 'utf8'),
            fs.readFile(path.join(__dirname, 'data/admins.json'), 'utf8')
        ]);

        let users = JSON.parse(usersData);
        let admins = JSON.parse(adminsData);

        // Remove from users if exists
        users.users = users.users.filter(u => u.email !== email);
        await fs.writeFile(
            path.join(__dirname, 'data/users.json'), 
            JSON.stringify(users, null, 2)
        );

        // Remove from admins if exists
        admins.admins = admins.admins.filter(a => a.email !== email);
        await fs.writeFile(
            path.join(__dirname, 'data/admins.json'), 
            JSON.stringify(admins, null, 2)
        );

        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete user' 
        });
    }
});

// Replace the existing add user route with this updated version
app.post('/api/admin/users', requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }

        const { email, role } = req.body;
        
        if (!email || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and role are required' 
            });
        }

        // Generate a new TOTP secret for the user
        const secret = authenticator.generateSecret();
        
        // Create new user object
        const newUser = {
            email,
            role,
            secret,
            verified: false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        // Determine which file to update based on role
        const filePath = role === 'admin' ? 
            path.join(__dirname, 'data/admins.json') : 
            path.join(__dirname, 'data/users.json');

        // Read existing data
        const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        // Add new user to appropriate array
        if (role === 'admin') {
            fileData.admins.push(newUser);
        } else {
            fileData.users.push(newUser);
        }

        // Write updated data back to file
        await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));

        res.status(201).json({ 
            success: true, 
            message: 'User added successfully',
            user: newUser
        });

    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add user' 
        });
    }
});

// Error handling
app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
}); 