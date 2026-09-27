import {Queue} from 'bullmq';import IORedis from 'ioredis';
let conn,instance;
export function redis(){if(!conn){conn=new IORedis(process.env.REDIS_URL??'redis://localhost:6379',{maxRetriesPerRequest:null});conn.on('error',()=>{})}return conn}
export function jobQueue(){if(!instance)instance=new Queue('video-processing',{connection:redis(),defaultJobOptions:{attempts:2,backoff:{type:'exponential',delay:2000},removeOnComplete:100,removeOnFail:100}});return instance}
