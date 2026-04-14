import type { Metadata, Viewport } from 'next';
import { Inter, DM_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'FlowPay — Send Money Instantly',
    template: '%s | FlowPay',
  },
  description: 'Send and receive money instantly with FlowPay. Your smart fintech wallet.',
  keywords: ['fintech', 'money transfer', 'payments', 'wallet'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0A0A0F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-[#0A0A0F] font-sans antialiased" suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              classNames: {
                toast:       'bg-[#12121A]/95 border border-white/8 text-white backdrop-blur-xl rounded-2xl shadow-2xl',
                title:       'text-white font-semibold text-sm',
                description: 'text-[#6B7280] text-xs',
                success:     'border-[#00D68F]/30',
                error:       'border-[#FF6B6B]/30',
                info:        'border-[#6C5CE7]/30',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
