'use client';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {NotebookView} from '@/components/NotebookView';
function CurrentNotebook(){const id=useSearchParams().get('id');return id?<NotebookView id={id}/>:<p>Choose a notebook from your dashboard.</p>}
export default function Notebook(){return <Suspense fallback={<p>Loading notebook...</p>}><CurrentNotebook/></Suspense>}
