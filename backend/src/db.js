import pg from 'pg';import pgvector from 'pgvector/pg';
export const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:10});
pool.on('connect',async client=>{try{await pgvector.registerTypes(client)}catch(e){if(!/vector type not found in the database/.test(String(e.message)))throw e}});
export const query=(sql,args=[])=>pool.query(sql,args);
