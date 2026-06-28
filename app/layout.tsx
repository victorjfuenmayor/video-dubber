import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'Video Dubber',
  description: 'English to Latin American Spanish AI dubbing',
};

// Runs synchronously during HTML parsing — before React, before first paint.
// Reads localStorage and system preference, then applies the .dark class.
const themeScript = `(function(){try{
  var s=localStorage.getItem('theme');
  var dark=s==='dark'||(s===null&&window.matchMedia('(prefers-color-scheme:dark)').matches);
  if(dark)document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased bg-slate-50 dark:bg-gray-950 transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
