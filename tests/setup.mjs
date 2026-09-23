// Tarayıcı modüllerini Node'da çalıştırmak için küçük ortam hazırlığı
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.location = { pathname: '/' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WEB = path.join(root, 'src/web/scripts');
export const DATA = path.join(root, 'data/web');

export async function loadDb() {
    const data = await import(path.join(WEB, 'core/data.js'));
    const corridor = JSON.parse(fs.readFileSync(path.join(DATA, 'corridor.json'), 'utf8'));
    data.db.corridor = corridor;
    data.db.types = corridor.types;
    return data;
}

export function readJSON(rel) {
    return JSON.parse(fs.readFileSync(path.join(DATA, rel), 'utf8'));
}
