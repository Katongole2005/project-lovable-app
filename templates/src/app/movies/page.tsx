import { Metadata } from 'next';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const isNoIndex = resolvedSearchParams && (resolvedSearchParams.sw !== undefined || 'sw' in resolvedSearchParams);

  return {
    title: 'Browse All Movies — Luganda Translated Films in HD | Moviebay',
    description: 'Explore the full Moviebay movie library. Stream or download Luganda translated blockbusters by VJ Junior, VJ Emmy, VJ Ice P and more in SD and FHD quality.',
    alternates: {
      canonical: 'https://s-u.in/movies',
    },
    ...(isNoIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

export default function MoviesPage() {
  return null;
}
