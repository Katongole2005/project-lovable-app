import ClientHome from '@/views/ClientHome';

// eslint-disable-next-line react-refresh/only-export-components
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: `Watch TV Series ${id} Online - Moviebay`,
    description: `Stream or download TV series ${id} in HD on Moviebay.`,
  };
}

export default function SeriesDetailPage() {
  return null;
}
