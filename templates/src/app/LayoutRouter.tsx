"use client";

import { usePathname } from 'next/navigation';
import ClientHome from '@/views/ClientHome';

export function LayoutRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Pages that ClientHome fully handles internally
  const isClientHomeRoute = pathname === '/' || 
                            pathname === '/movies' || 
                            pathname === '/series' || 
                            pathname === '/originals' || 
                            pathname === '/search' ||
                            pathname.startsWith('/movie/') ||
                            pathname.startsWith('/series/');
                            
  if (isClientHomeRoute) {
    return (
      <>
        <ClientHome />
        {/* We keep children in the DOM but hidden so Next.js can still inject SEO metadata from the active page */}
        <div className="hidden" aria-hidden="true">{children}</div>
      </>
    );
  }
  
  // For other pages (admin, profile, privacy, auth, etc), render normally
  return children;
}
