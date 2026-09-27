'use client';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {LiveWorkspace} from '@/components/LiveWorkspace';
function CurrentStudy(){const params=useSearchParams(),notebookId=params.get('notebook'),videoId=params.get('video');return notebookId&&videoId?<LiveWorkspace notebookId={notebookId} videoId={videoId}/>:<p>Choose a video from your notebook.</p>}
export default function Study(){return <Suspense fallback={<p>Loading study workspace...</p>}><CurrentStudy/></Suspense>}
