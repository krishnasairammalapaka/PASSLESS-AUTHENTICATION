const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Function to read JSON file
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return { users: [] };
    }
}

// API endpoint to get all users
router.get('/users', async (req, res) => {
    console.log('Fetching users...');
    try {
        const usersPath = path.join(__dirname, '../data/users.json');
        const adminsPath = path.join(__dirname, '../data/admins.json');
        
        console.log('Reading from:', usersPath);
        console.log('Reading from:', adminsPath);
        
        const usersData = await readJsonFile(usersPath);
        const adminsData = await readJsonFile(adminsPath);

        console.log('Users found:', usersData.users.length);
        console.log('Admins found:', adminsData.admins.length);

        res.json({
            users: usersData.users || [],
            admins: adminsData.admins || []
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// API endpoint to add a new user
router.post('/users', async (req, res) => {
    try {
        const { email } = req.body;
        const usersData = await readJsonFile(path.join(__dirname, '../data/users.json'));
        
        // Add new user
        const newUser = {
            email,
            secret: Math.random().toString(36).substr(2, 10),
            verified: false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            role: 'user'
        };

        usersData.users.push(newUser);

        // Write back to file
        await fs.writeFile(
            path.join(__dirname, '../data/users.json'),
            JSON.stringify(usersData, null, 2)
        );

        res.json({ success: true, user: newUser });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ error: 'Failed to add user' });
    }
});

// API endpoint to delete a user
router.delete('/users/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const usersData = await readJsonFile(path.join(__dirname, '../data/users.json'));
        
        usersData.users = usersData.users.filter(user => user.email !== email);

        // Write back to file
        await fs.writeFile(
            path.join(__dirname, '../data/users.json'),
            JSON.stringify(usersData, null, 2)
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router; 