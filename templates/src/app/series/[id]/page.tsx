import { supabase } from '@/integrations/supabase/client';

// Generate dynamic metadata for SEO by fetching the actual series
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const { data: series } = await supabase
    .from('movies')
    .select('title, description, image_url')
    .eq('mobifliks_id', id)
    .single();

  if (!series) {
    return {
      title: 'Watch TV Series Online - Moviebay',
    };
  }

  return {
    title: `Watch ${series.title} Online - Moviebay`,
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
