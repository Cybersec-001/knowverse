import type {MetadataRoute} from 'next';
export const dynamic="force-static";
const base='https://cybersec-001.github.io/knowverse';
export default function sitemap():MetadataRoute.Sitemap{return ['/','/login','/signup'].map(path=>({url:base+path,changeFrequency:'monthly' as const,priority:path==='/'?1:0.4}))}
