const path = require('path');

module.exports = {
    port: process.env.PORT || 3000,
    appName: 'YourApp',
    dataPath: {
        users: path.join(__dirname, '../data/users.json'),
        admins: path.join(__dirname, '../data/admins.json')
    }
}; 