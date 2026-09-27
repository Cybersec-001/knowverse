import 'dotenv/config';import {readFile} from 'node:fs/promises';import {query,pool} from './db.js';
try{await query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));console.log('Schema ready')}finally{await pool.end()}
