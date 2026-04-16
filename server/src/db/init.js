import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from './helpers.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(currentDirectory, './schema.sql');

export async function initializeDatabase() {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await exec(schema);
}
