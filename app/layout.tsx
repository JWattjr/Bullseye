import type {Metadata} from 'next';
import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import './globals.css';
import './live.css';
import './consumer.css';
import './music.css';
import './music-review.css';
export const metadata:Metadata={title:'Bullseye — Film & Music predictions',description:'Forecast film openings and Billboard 200 album debuts with StudioNet GEN pools and free season points. Pick an outcome and inspect the evidence.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
