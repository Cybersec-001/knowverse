import 'dotenv/config';
import {startWorker} from './worker.js';
const {runtimeCheck}=await import('./runtime-check.js');await runtimeCheck();
startWorker();
await import('./server.js');
