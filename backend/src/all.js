import 'dotenv/config';
import {startWorker} from './worker.js';
startWorker();
await import('./server.js');
