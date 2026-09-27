import type {NextConfig} from 'next';
const pages=process.env.GITHUB_PAGES==='true';
const nextConfig:NextConfig={
  ...(pages?{output:'export',basePath:'/knowverse',images:{unoptimized:true}}:{}),
};
export default nextConfig;
