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
    const cleanId = id.replace(/^(series|movie)_/, '').replace(/-/g, ' ');
    const formattedTitle = cleanId.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const displayTitle = formattedTitle.length > 50 ? `${formattedTitle.slice(0, 47)}...` : formattedTitle;
    return {
      title: `${displayTitle} | Moviebay`,
      alternates: {
        canonical: `https://s-u.in/movie/${id}`,
      },
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
    ? `${movie.title} - VJ ${cleanVj} | Moviebay`
    : `${movie.title} | Moviebay`;

  const cleanDesc = movie.description ? movie.description.replace(/\s+/g, ' ').trim() : '';
  const fallbackDesc = cleanVj
    ? `Stream or download ${movie.title} Luganda translated by VJ ${cleanVj} in high definition on Moviebay. Access translated commentary and rapid downloads.`
    : `Stream or download ${movie.title} in HD on Moviebay. Watch translated and original blockbuster movies online with rapid downloads.`;
  const seoDesc = cleanDesc ? `${cleanDesc.slice(0, 150)}... Translated by VJ ${cleanVj || 'Junior'}.` : fallbackDesc;

  return {
    title: seoTitle,
    description: seoDesc,
    alternates: {
      canonical: `https://s-u.in/movie/${id}`,
    },
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
