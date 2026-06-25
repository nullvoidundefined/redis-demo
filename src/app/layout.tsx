/** Root layout: global styles plus the shared demo navigation. */
import type { ReactNode } from 'react';
import { Nav } from '@/components/Nav/Nav';
import './globals.scss';

export const metadata = { title: 'Redis Patterns Demo' };

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Nav />
                <main>{children}</main>
            </body>
        </html>
    );
}
