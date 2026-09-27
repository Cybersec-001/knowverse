export const API=process.env.NEXT_PUBLIC_API_URL??'';
export const token=()=>typeof window==='undefined'?'':localStorage.getItem('knowverse-token')??'';
export async function api<T>(path:string,init:RequestInit={}){if(!API)throw new Error('Backend is not configured');const headers:Record<string,string>={Authorization:`Bearer ${token()}`,...init.headers as Record<string,string>};if(init.body && !(init.body instanceof FormData))headers['Content-Type']='application/json';const r=await fetch(`${API}${path}`,{...init,headers});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error??`Request failed (${r.status})`);return data as T}
export const backendEnabled=()=>Boolean(API);
