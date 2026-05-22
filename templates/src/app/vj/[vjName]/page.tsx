import VJPage from '@/views/VJPage';

export function generateMetadata({ params }: { params: { vjName: string } }) {
  return {
    title: `Movies translated by VJ ${decodeURIComponent(params.vjName)} - Moviebay`,
  };
}

export default function VJRoutePage() {
  return <VJPage />;
}
