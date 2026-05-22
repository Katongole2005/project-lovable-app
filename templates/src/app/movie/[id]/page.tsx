import ClientHome from '@/views/ClientHome';

// In a real production Next.js app, we would fetch the movie data here
// and generate dynamic metadata for SEO.
// Since the modal is embedded in ClientHome, we just render ClientHome.
// eslint-disable-next-line react-refresh/only-export-components
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: `Watch Movie ${id} Online - Moviebay`,
    description: `Stream or download movie ${id} in HD on Moviebay.`,
  };
}

export default function MoviePage() {
  return null;
}
