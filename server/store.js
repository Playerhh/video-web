import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const dataFile = path.join(dataDir, 'app.json');

function emptyData() {
    return { users: [], sessions: [], favorites: [], progress: [] };
}

function readData() {
    try {
        const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        return {
            users: Array.isArray(parsed.users) ? parsed.users : [],
            sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
            favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
            progress: Array.isArray(parsed.progress) ? parsed.progress : [],
        };
    } catch {
        return emptyData();
    }
}

function writeData(data) {
    fs.mkdirSync(dataDir, { recursive: true });
    const tempFile = `${dataFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, dataFile);
}

let queue = Promise.resolve();

export function updateData(mutator) {
    const run = queue.then(() => {
        const data = readData();
        const result = mutator(data);
        writeData(data);
        return result;
    });
    queue = run.then(() => {}, () => {});
    return run;
}
