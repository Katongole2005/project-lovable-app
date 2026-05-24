import { Providers } from './providers';
import { LayoutRouter } from './LayoutRouter';
import '../index.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://s-u.in'),
  title: 'Moviebay - Stream Movies & TV Shows',
  description: 'Watch the latest movies and TV shows online in high quality.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Moviebay',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  const originalError = console.error;
                  console.error = function(...args) {
                    const msg = args.map(function(x) {
                      return x && x.toString ? x.toString() : '';
                    }).join(' ');
                    if (msg.includes('bis_skin_checked') || msg.includes('hydration') || msg.includes('Hydration') || msg.includes('Mismatched')) {
                      return;
                    }
                    originalError.apply(console, args);
                  };
                }
              })();
            `
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <LayoutRouter>{children}</LayoutRouter>
        </Providers>
      </body>
    </html>
  );
}
