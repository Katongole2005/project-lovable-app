import { supabase } from '@/integrations/supabase/client';
import { fromSlug } from '@/lib/slug';

// Generate dynamic metadata for SEO by fetching the actual series
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = fromSlug(id);
  
  let series = null;
  try {
    const { data } = await supabase
      .from('movies')
      .select('title, description, image_url')
      .eq('mobifliks_id', numericId)
      .single();
    series = data;
  } catch (err) {
    console.error("SEO metadata fetch error:", err);
  }

  if (!series) {
    // Generate clean fallback titles from the route ID so search engines get rich previews
    const cleanId = id.replace(/^(series|movie)_/, '').replace(/-/g, ' ');
    const formattedTitle = cleanId.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const displayTitle = formattedTitle.length > 50 ? `${formattedTitle.slice(0, 47)}...` : formattedTitle;
    return {
      title: `Watch ${displayTitle} Online HD - Moviebay`,
      description: `Stream or download ${displayTitle} in high definition on Moviebay. Access translated content, Video Joker commentary, and rapid downloads.`,
    };
  }

  const cleanTitle = series.title.length > 45 ? `${series.title.slice(0, 42)}...` : series.title;

  return {
    title: `Watch ${cleanTitle} Online - Moviebay`,
    description: series.description ? `${series.description.slice(0, 150)}...` : `Stream or download ${series.title} in HD on Moviebay.`,
    openGraph: {
      title: `Watch ${series.title} Online - Moviebay`,
      description: series.description ? `${series.description.slice(0, 150)}...` : `Stream or download ${series.title} in HD on Moviebay.`,
      images: series.image_url ? [{ url: series.image_url }] : [],
    }
  };
}

export default function SeriesDetailPage() {
  return null;
}
