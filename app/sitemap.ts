import type {MetadataRoute} from 'next';
export const dynamic="force-static";
const base='https://knowverse.dpdns.org';
export default function sitemap():MetadataRoute.Sitemap{return ['/','/login','/signup','/privacy','/terms'].map(path=>({url:base+path,changeFrequency:'monthly' as const,priority:path==='/'?1:0.4}))}
