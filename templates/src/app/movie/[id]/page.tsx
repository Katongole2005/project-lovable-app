import ClientHome from '@/views/ClientHome';
import { supabase } from '@/integrations/supabase/client';
import { fromSlug } from '@/lib/slug';

// Generate dynamic metadata for SEO by fetching the actual movie
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = fromSlug(id);
  
  const { data: movie } = await supabase
    .from('movies')
    .select('title, description, image_url')
    .eq('mobifliks_id', numericId)
    .single();

  if (!movie) {
    return {
      title: 'Watch Online - Moviebay',
    };
  }

  return {
    title: `Watch ${movie.title} Online - Moviebay`,
    description: movie.description ? `${movie.description.slice(0, 150)}...` : `Stream or download ${movie.title} in HD on Moviebay.`,
    openGraph: {
      title: `Watch ${movie.title} Online - Moviebay`,
      description: movie.description ? `${movie.description.slice(0, 150)}...` : `Stream or download ${movie.title} in HD on Moviebay.`,
      images: movie.image_url ? [{ url: movie.image_url }] : [],
    }
  };
}

export default function MoviePage() {
  return null;
}
