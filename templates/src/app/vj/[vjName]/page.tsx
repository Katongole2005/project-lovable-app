import VJPage from '@/views/VJPage';

export async function generateMetadata({ params }: { params: Promise<{ vjName: string }> }) {
  const { vjName } = await params;
  const decodedName = decodeURIComponent(vjName);
  const displayName = decodedName.charAt(0).toUpperCase() + decodedName.slice(1);

  return {
    title: `VJ ${displayName} Movies — Watch Luganda Translated Films Online | Moviebay`,
    description: `Stream or download all movies translated by VJ ${displayName} on Moviebay. Watch the latest Luganda translated blockbusters in SD and FHD quality — free streaming.`,
    alternates: {
      canonical: `https://s-u.in/vj/${encodeURIComponent(vjName)}`,
    },
  };
}

export default function VJRoutePage() {
  return <VJPage />;
}
