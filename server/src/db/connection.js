import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(currentDirectory, '../../data/study-group-matcher.sqlite');
const absolutePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : defaultDbPath;

fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

const db = new sqlite3.Database(absolutePath);

export default db;
