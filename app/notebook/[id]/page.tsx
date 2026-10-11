import type {Metadata} from 'next';
export const metadata:Metadata={title:'Notebook',description:'A Knowverse notebook of lesson videos and study notes.',robots:{index:false,follow:false}};
import {NotebookView} from '@/components/NotebookView';
export default async function NotebookPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <NotebookView id={id}/>}

export function generateStaticParams(){return [{id:'biology'},{id:'physics'},{id:'history'}]}
