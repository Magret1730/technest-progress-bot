import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TechNest Slack Bot',
  description: 'Sends weekly TechNest progress updates to Chan Meng on Slack.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
