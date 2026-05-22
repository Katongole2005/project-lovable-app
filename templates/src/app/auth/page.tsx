import Auth from '@/views/Auth';
import { Suspense } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const metadata = {
  title: 'Moviebay - Login / Signup',
};

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Auth />
    </Suspense>
  );
}
