import {NotebookView} from '@/components/NotebookView';
export default async function NotebookPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <NotebookView id={id}/>}

export function generateStaticParams(){return [{id:'biology'},{id:'physics'},{id:'history'}]}
