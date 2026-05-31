import { supabase } from '@/integrations/supabase/client';
import { fromSlug } from '@/lib/slug';

// Generate dynamic metadata for SEO by fetching the actual series
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slugId = fromSlug(id);
  const parsedId = parseInt(slugId, 10);
  
  let series = null;
  try {
    let query = supabase
      .from('movies')
      .select('id, title, description, image_url, vj_name, year');

    if (!isNaN(parsedId) && String(parsedId) === slugId) {
      query = query.eq('id', parsedId);
    } else {
      query = query.eq('mobifliks_id', slugId);
    }

    const { data } = await query.maybeSingle();
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

  const cleanVj = series.vj_name ? series.vj_name.replace(/^VJ\s+/i, '').trim() : '';
  const cleanTitle = series.title.length > 45 ? `${series.title.slice(0, 42)}...` : series.title;
  const seoTitle = cleanVj
    ? `${cleanTitle} Luganda Translated by VJ ${cleanVj} - Watch Online | Moviebay`
    : `Watch ${cleanTitle} Online - Moviebay`;

  const cleanDesc = series.description ? series.description.replace(/\s+/g, ' ').trim() : '';
  const fallbackDesc = cleanVj
    ? `Stream or download ${series.title} Luganda translated by VJ ${cleanVj} in high definition on Moviebay. Access translated commentary and rapid downloads.`
    : `Stream or download ${series.title} in HD on Moviebay. Watch translated and original blockbuster series online with rapid downloads.`;
  const seoDesc = cleanDesc ? `${cleanDesc.slice(0, 150)}... Translated by VJ ${cleanVj || 'Junior'}.` : fallbackDesc;

  return {
    title: seoTitle,
    description: seoDesc,
    openGraph: {
      title: seoTitle,
      description: seoDesc,
      images: series.image_url ? [{ url: series.image_url }] : [],
    }
  };
}

export default function SeriesDetailPage() {
  return null;
}
