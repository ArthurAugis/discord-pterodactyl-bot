const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const getPath = (name) => path.join(DATA_DIR, `${name}.json`);

module.exports = {
    /**
     * Reads a JSON file from the data directory.
     * @param {string} name Filename without extension
     * @returns {Object} Parsed JSON content or empty object
     */
    read: (name) => {
        const p = getPath(name);
        if (!fs.existsSync(p)) return {};
        try {
            return JSON.parse(fs.readFileSync(p, 'utf8'));
        } catch (e) {
            console.error(`[Storage] Failed to read ${name}`, e);
            return {};
        }
    },
    /**
     * Writes data to a JSON file in the data directory.
     * @param {string} name Filename without extension
     * @param {Object} data Data to write
     */
    write: (name, data) => {
        try {
            fs.writeFileSync(getPath(name), JSON.stringify(data, null, 2));
        } catch (e) {
            console.error(`[Storage] Failed to write ${name}`, e);
        }
    }
};
