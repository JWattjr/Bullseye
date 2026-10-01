import type {Metadata} from 'next';
import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import './globals.css';
import './live.css';
export const metadata:Metadata={title:'Bullseye — Call the opening weekend',description:'A free film forecasting league. Pick a range, track the result, inspect the evidence.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
