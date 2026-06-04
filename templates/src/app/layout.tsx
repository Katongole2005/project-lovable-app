import { Providers } from './providers';
import { LayoutRouter } from './LayoutRouter';
import Script from 'next/script';
import '../index.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://s-u.in'),
  title: 'Moviebay — Watch Luganda Translated Movies & Series Online in HD',
  description: 'Stream or download the latest Luganda translated movies and TV series by VJ Junior, VJ Emmy, VJ Ice P and more on Moviebay. Free HD streaming and instant downloads.',
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: 'https://s-u.in/',
  },
  appleWebApp: {
    capable: true,
    title: 'Moviebay',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    url: 'https://s-u.in/',
    type: 'website',
    title: 'Moviebay — Watch Luganda Translated Movies & Series Online in HD',
    description: 'Stream or download the latest Luganda translated movies and TV series by VJ Junior, VJ Emmy, VJ Ice P and more on Moviebay. Free HD streaming and instant downloads.',
    images: [
      {
        url: 'https://opengraph.b-cdn.net/production/images/25761c18-9506-4190-b1c1-5d5802661dcb.jpg?token=fEJiQ52XMTQopK-xQHzbXhciYWEm__5xikKyrqv3cXU&height=1280&width=1024&expires=33315649292',
        width: 1024,
        height: 1280,
        alt: 'Moviebay — Watch Luganda Translated Movies & Series Online in HD',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    domain: 's-u.in',
    url: 'https://s-u.in/',
    title: 'Moviebay — Watch Luganda Translated Movies & Series Online in HD',
    description: 'Stream or download the latest Luganda translated movies and TV series by VJ Junior, VJ Emmy, VJ Ice P and more on Moviebay. Free HD streaming and instant downloads.',
    images: ['https://opengraph.b-cdn.net/production/images/25761c18-9506-4190-b1c1-5d5802661dcb.jpg?token=fEJiQ52XMTQopK-xQHzbXhciYWEm__5xikKyrqv3cXU&height=1280&width=1024&expires=33315649292'],
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
        {/* Preconnect to image CDN — opens TCP+TLS before image URLs are discovered.
            Saves 300-600ms on first hero backdrop/poster fetch, directly improving LCP. */}
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
      </head>
      <body suppressHydrationWarning>
        {/* Google Analytics — loaded during idle time to avoid blocking LCP/TBT */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-Y386N5D886"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-Y386N5D886');
          `}
        </Script>
        <Providers>
          <LayoutRouter>{children}</LayoutRouter>
        </Providers>
      </body>
    </html>
  );
}
