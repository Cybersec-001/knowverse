import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Knowverse - Learn from any video',description:'Turn a video into a study package you can explore and trust.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
