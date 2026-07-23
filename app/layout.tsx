import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NBPDCL Bill Dashboard',
  description: 'NBPDCL electricity bill management dashboard, CA account manager, and billing utility tools.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="relative z-10 max-w-[1440px] mx-auto p-4 md:p-6">
          {children}
        </div>
      </body>
    </html>
  );
}
