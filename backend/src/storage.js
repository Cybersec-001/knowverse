import {S3Client,PutObjectCommand,GetObjectCommand,HeadBucketCommand,CreateBucketCommand} from '@aws-sdk/client-s3';
import {query} from './db.js';
const bucket=process.env.S3_BUCKET??'knowverse';
const s3Configured=Boolean(process.env.S3_ENDPOINT&&process.env.S3_ACCESS_KEY&&process.env.S3_SECRET_KEY);
const s3=s3Configured?new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION??'us-east-1',forcePathStyle:process.env.S3_FORCE_PATH_STYLE!=='false',credentials:{accessKeyId:process.env.S3_ACCESS_KEY,secretAccessKey:process.env.S3_SECRET_KEY}}):null;
export const maxUploadMb=()=>Math.min(25,Number(process.env.MAX_UPLOAD_MB??25));
export async function ensureBucket(){if(!s3)return;try{await s3.send(new HeadBucketCommand({Bucket:bucket}))}catch(e){if(e.name==='NotFound'||e.$metadata?.httpStatusCode===404)await s3.send(new CreateBucketCommand({Bucket:bucket}));else throw e}}
export async function store(key,body,type='application/octet-stream'){if(body.length>maxUploadMb()*1024*1024)throw new Error(`Video upload exceeds ${maxUploadMb()}MB limit`);if(s3){await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:body,ContentType:type}));return key}await query('INSERT INTO video_uploads(storage_key,body,mime_type) VALUES($1,$2,$3) ON CONFLICT(storage_key) DO UPDATE SET body=EXCLUDED.body,mime_type=EXCLUDED.mime_type',[key,body,type]);return key}
export async function load(key){if(s3){const result=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}));return Buffer.from(await result.Body.transformToByteArray())}const {rows:[upload]}=await query('SELECT body FROM video_uploads WHERE storage_key=$1',[key]);if(!upload)throw new Error('Video upload not found');return Buffer.from(upload.body)}
