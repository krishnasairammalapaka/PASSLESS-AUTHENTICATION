const fs = require('fs').promises;
const config = require('../config/config');

async function readJSONFile(type) {
    try {
        const filePath = config.dataPath[type];
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${type} file:`, error);
        return null;
    }
}

async function writeJSONFile(type, data) {
    try {
        const filePath = config.dataPath[type];
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${type} file:`, error);
        return false;
    }
}

module.exports = {
    readJSONFile,
    writeJSONFile
}; 