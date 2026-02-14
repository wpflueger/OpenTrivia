import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenTrivia - P2P Trivia Game',
  description: 'Open alternative to Kahoot - Play trivia games with friends via WebRTC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
