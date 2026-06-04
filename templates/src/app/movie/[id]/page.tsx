import ClientHome from '@/views/ClientHome';
import { supabase } from '@/integrations/supabase/client';
import { fromSlug } from '@/lib/slug';

// Generate dynamic metadata for SEO by fetching the actual movie
export async function generateMetadata({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const isNoIndex = resolvedSearchParams && (resolvedSearchParams.sw !== undefined || 'sw' in resolvedSearchParams);
  
  const slugId = fromSlug(id);
  const parsedId = parseInt(slugId, 10);
  
  let query = supabase
    .from('movies')
    .select('id, title, description, image_url, vj_name, year');

  if (!isNaN(parsedId) && String(parsedId) === slugId) {
    query = query.eq('id', parsedId);
  } else {
    query = query.eq('mobifliks_id', slugId);
  }

  const { data: movie } = await query.maybeSingle();
  
  if (!movie) {
    return {
      title: 'Watch Online - Moviebay',
      ...(isNoIndex && {
        robots: {
          index: false,
          follow: false,
        },
      }),
    };
  }

  const cleanVj = movie.vj_name ? movie.vj_name.replace(/^VJ\s+/i, '').trim() : '';
  const seoTitle = cleanVj
    ? `${movie.title} Luganda Translated by VJ ${cleanVj} - Watch Online | Moviebay`
    : `Watch ${movie.title} Online in HD - Moviebay`;

  const cleanDesc = movie.description ? movie.description.replace(/\s+/g, ' ').trim() : '';
  const fallbackDesc = cleanVj
    ? `Stream or download ${movie.title} Luganda translated by VJ ${cleanVj} in high definition on Moviebay. Access translated commentary and rapid downloads.`
    : `Stream or download ${movie.title} in HD on Moviebay. Watch translated and original blockbuster movies online with rapid downloads.`;
  const seoDesc = cleanDesc ? `${cleanDesc.slice(0, 150)}... Translated by VJ ${cleanVj || 'Junior'}.` : fallbackDesc;

  return {
    title: seoTitle,
    description: seoDesc,
    openGraph: {
      title: seoTitle,
      description: seoDesc,
      images: movie.image_url ? [{ url: movie.image_url }] : [],
    },
    ...(isNoIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

export default function MoviePage() {
  return null;
}
