import 'dotenv/config';import app from './app.js';import {ensureBucket} from './storage.js';import {attachSockets} from './socket.js';
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw new Error('Set JWT_SECRET to a random value of at least 32 characters');
await ensureBucket();const port=Number(process.env.PORT??4000);const server=app.listen(port,()=>console.log(`Knowverse API listening on ${port}`));attachSockets(server);
