import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Surgery Billing Dashboard',
  description: 'Track surgery billing and payment recovery',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Providers>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <div className="p-8">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
