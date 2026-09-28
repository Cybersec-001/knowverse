import {createHash} from 'node:crypto';
import {redis} from './queue.js';
const script="local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return {n,redis.call('TTL',KEYS[1])}";
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,32);
export function authRateLimit({kind,perIp,perEmail,windowSeconds=600},client=redis){return async(req,res,next)=>{
 const ip=String(req.ip??req.socket.remoteAddress??'unknown');
 const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase().slice(0,254):'';
 const checks=[[`auth:${kind}:ip:${hash(ip)}`,perIp]];
 if(email)checks.push([`auth:${kind}:email:${hash(email)}`,perEmail]);
 try{for(const [key,limit] of checks){const [count,ttl]=await client().eval(script,1,key,windowSeconds);if(Number(count)>limit){res.set('Retry-After',String(Math.max(1,Number(ttl))));return res.status(429).json({error:'Too many attempts. Please try again later.'})}}next()}
 catch(e){console.error('auth.rate-limit.unavailable',String(e.message).slice(0,120));return res.status(503).json({error:'Sign-in protection is temporarily unavailable. Try again shortly.'})}
}}
