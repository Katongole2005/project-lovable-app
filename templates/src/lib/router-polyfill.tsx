"use client";

import { useRouter, usePathname, useSearchParams as useNextSearchParams, useParams as useNextParams } from 'next/navigation';
import NextLink from 'next/link';
import { forwardRef, useEffect, useMemo, useSyncExternalStore } from 'react';

let memoryState: unknown | undefined;
const listeners = new Set<() => void>();
let notifyQueued = false;

type LocationSnapshot = {
  pathname: string;
  search: string;
  state: unknown;
};

let cachedClientSnapshot: LocationSnapshot | null = null;
let cachedClientStateKey = '';

function serializeRouterState(state: unknown): string {
  if (state == null) return '';
  try {
    return JSON.stringify(state);
  } catch {
    return String(state);
  }
}

function readStoredRouterState(): unknown {
  if (memoryState !== undefined) {
    return memoryState;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = sessionStorage.getItem('moviebay_router_state');
    if (stored) {
      memoryState = JSON.parse(stored) as unknown;
      return memoryState;
    }
  } catch {
    /* ignore */
  }

  memoryState = null;
  return null;
}

function getClientLocationSnapshot(): LocationSnapshot {
  const pathname = window.location.pathname;
  const search = window.location.search;
  const state = readStoredRouterState();
  const stateKey = serializeRouterState(state);

  if (
    cachedClientSnapshot &&
    cachedClientSnapshot.pathname === pathname &&
    cachedClientSnapshot.search === search &&
    cachedClientStateKey === stateKey
  ) {
    return cachedClientSnapshot;
  }

  cachedClientStateKey = stateKey;
  cachedClientSnapshot = { pathname, search, state };
  return cachedClientSnapshot;
}

function scheduleNotifyListeners() {
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;
    listeners.forEach((listener) => listener());
  });
}

function subscribeToHistory(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== 'undefined') {
  const anyWindow = window as Window & { __wrapped_history__?: boolean };
  if (!anyWindow.__wrapped_history__) {
    anyWindow.__wrapped_history__ = true;
    const originalPush = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);

    window.history.pushState = function pushState(state, unused, url) {
      originalPush(state, unused, url);
      scheduleNotifyListeners();
    };

    window.history.replaceState = function replaceState(state, unused, url) {
      originalReplace(state, unused, url);
      scheduleNotifyListeners();
    };

    window.addEventListener('popstate', () => {
      scheduleNotifyListeners();
    });
  }
}

export function useNavigate() {
  const router = useRouter();
  return (path: string | number, options?: { replace?: boolean; state?: unknown; shallow?: boolean }) => {
    if (typeof path === 'number') {
      if (path === -1) router.back();
      return;
    }

    if (options?.shallow) {
      if (options.state !== undefined) {
        memoryState = options.state;
        cachedClientSnapshot = null;
        try {
          sessionStorage.setItem('moviebay_router_state', JSON.stringify(options.state));
        } catch {
          /* ignore */
        }
      } else {
        memoryState = null;
        cachedClientSnapshot = null;
        try {
          sessionStorage.removeItem('moviebay_router_state');
        } catch {
          /* ignore */
        }
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
      cachedClientSnapshot = null;
      try {
        sessionStorage.setItem('moviebay_router_state', JSON.stringify(options.state));
      } catch {
        /* ignore */
      }
    } else {
      memoryState = null;
      cachedClientSnapshot = null;
      try {
        sessionStorage.removeItem('moviebay_router_state');
      } catch {
        /* ignore */
      }
    }

    if (options?.replace) {
      router.replace(path, { scroll: false });
    } else {
      router.push(path, { scroll: false });
    }
  };
}

export function useLocation() {
  const nextPathname = usePathname();
  const nextSearchParams = useNextSearchParams();
  const nextSearch = nextSearchParams?.toString() ?? '';

  const serverSnapshot = useMemo((): LocationSnapshot => {
    return {
      pathname: nextPathname || '/',
      search: nextSearch ? `?${nextSearch}` : '',
      state: null,
    };
  }, [nextPathname, nextSearch]);

  const snapshot = useSyncExternalStore(
    subscribeToHistory,
    getClientLocationSnapshot,
    () => serverSnapshot,
  );

  return useMemo(
    () => ({
      pathname: snapshot.pathname,
      search: snapshot.search,
      hash: typeof window !== 'undefined' ? window.location.hash : '',
      state: snapshot.state,
    }),
    [snapshot],
  );
}

export function useParams() {
  return useNextParams() || {};
}

export function useSearchParams() {
  const params = useNextSearchParams();
  return [
    params || new URLSearchParams(),
    () => {
      console.warn("setSearchParams not fully implemented in polyfill");
    },
  ] as const;
}

/** React Router compatibility — Next.js App Router does not expose navigation type. */
export function useNavigationType() {
  return "POP" as const;
}

export function BrowserRouter({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Routes({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Route({ element }: { element?: React.ReactNode; path?: string; index?: boolean }) {
  return <>{element}</>;
}

export const Link = forwardRef<HTMLAnchorElement, React.ComponentProps<typeof NextLink> & { to?: string }>(
  ({ to, href, replace, ...props }, ref) => {
    const resolvedHref = to ?? href ?? "/";
    return <NextLink href={resolvedHref} replace={replace} ref={ref} {...props} />;
  },
);
Link.displayName = "Link";

export const NavLink = forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof NextLink> & {
    to?: string;
    className?: string | ((args: { isActive: boolean }) => string);
    style?: React.CSSProperties | ((args: { isActive: boolean }) => React.CSSProperties);
  }
>(({ to, href, className, style, ...props }, ref) => {
  const pathname = usePathname();
  const resolvedHref = to ?? href ?? "/";
  const isActive = pathname === resolvedHref;

  const computedClassName = typeof className === "function" ? className({ isActive }) : className;
  const computedStyle = typeof style === "function" ? style({ isActive }) : style;

  return (
    <NextLink
      href={resolvedHref}
      className={computedClassName}
      style={computedStyle}
      ref={ref}
      {...props}
    />
  );
});
NavLink.displayName = "NavLink";

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
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
