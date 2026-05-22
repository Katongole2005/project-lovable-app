import { Providers } from './providers';
import { LayoutRouter } from './LayoutRouter';
import '../index.css';

export const metadata = {
  title: 'Moviebay - Stream Movies & TV Shows',
  description: 'Watch the latest movies and TV shows online in high quality.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <LayoutRouter>{children}</LayoutRouter>
        </Providers>
      </body>
    </html>
  );
}
