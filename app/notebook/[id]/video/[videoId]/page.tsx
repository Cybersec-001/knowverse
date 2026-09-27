import {Workspace} from '@/components/Workspace';import {LiveWorkspace} from '@/components/LiveWorkspace';
export default async function VideoPage({params}:{params:Promise<{id:string;videoId:string}>}){const {id,videoId}=await params;return process.env.NEXT_PUBLIC_API_URL?<LiveWorkspace notebookId={id} videoId={videoId}/>:<Workspace/>}

export function generateStaticParams(){return [{id:'biology',videoId:'cell-biology'}]}
