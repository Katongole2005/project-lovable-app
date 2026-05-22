"use client";

import { useRouter, usePathname, useSearchParams as useNextSearchParams, useParams as useNextParams } from 'next/navigation';
import NextLink from 'next/link';
import { forwardRef, useEffect } from 'react';

let memoryState: any = null;

export function useNavigate() {
  const router = useRouter();
  return (path: string | number, options?: { replace?: boolean, state?: any, shallow?: boolean }) => {
    if (typeof path === 'number') {
      if (path === -1) router.back();
      return;
    }
    
    if (options?.shallow) {
      if (options.state !== undefined) {
        memoryState = options.state;
        try { sessionStorage.setItem('moviebay_router_state', JSON.stringify(options.state)); } catch (e) {}
      } else {
        memoryState = null;
        try { sessionStorage.removeItem('moviebay_router_state'); } catch (e) {}
      }
      if (options.replace) {
        window.history.replaceState(options.state || {}, '', path);
      } else {
        window.history.pushState(options.state || {}, '', path);
      }
      return;
    }
    if (options?.state !== undefined) {
      memoryState = options.state;
      try {
        sessionStorage.setItem('moviebay_router_state', JSON.stringify(options.state));
      } catch (e) {}
    } else {
      memoryState = null;
      try {
        sessionStorage.removeItem('moviebay_router_state');
      } catch (e) {}
    }
    if (options?.replace) {
      router.replace(path, { scroll: false });
    } else {
      router.push(path, { scroll: false });
    }
  };
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  
  // Try to recover state from memory or session storage
  let state = memoryState;
  if (!state && typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('moviebay_router_state');
      if (stored) state = JSON.parse(stored);
    } catch (e) {}
  }

  return {
    pathname: pathname || '/',
    search: searchParams ? `?${searchParams.toString()}` : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    state: state,
  };
}

export function useParams() {
  return useNextParams() || {};
}

export function useSearchParams() {
  const params = useNextSearchParams();
  return [
    params || new URLSearchParams(),
    (newParams: any) => {
      // Stub for set params if they use it. Real implementation would use router.push
      console.warn("setSearchParams not fully implemented in polyfill");
    }
  ] as const;
}

export const Link = forwardRef<HTMLAnchorElement, any>(({ to, replace, state, ...props }, ref) => {
  return <NextLink href={to} replace={replace} ref={ref} {...props} />;
});
Link.displayName = "Link";

export const NavLink = forwardRef<HTMLAnchorElement, any>(({ to, className, style, ...props }, ref) => {
  const pathname = usePathname();
  const isActive = pathname === to;
  
  const computedClassName = typeof className === 'function' ? className({ isActive }) : className;
  const computedStyle = typeof style === 'function' ? style({ isActive }) : style;
  
  return <NextLink href={to} className={computedClassName} style={computedStyle} ref={ref} {...props} />;
});
NavLink.displayName = "NavLink";

export function Navigate({ to, replace }: { to: string, replace?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) {
      router.replace(to, { scroll: false });
    } else {
      router.push(to, { scroll: false });
    }
  }, [to, replace, router]);
  return null;
}
