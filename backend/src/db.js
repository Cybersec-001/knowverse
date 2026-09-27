import pg from 'pg';import pgvector from 'pgvector/pg';
export const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:10});
pool.on('connect',async client=>{await pgvector.registerTypes(client)});
export const query=(sql,args=[])=>pool.query(sql,args);
