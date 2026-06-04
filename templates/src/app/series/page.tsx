import { Metadata } from 'next';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const isNoIndex = resolvedSearchParams && (resolvedSearchParams.sw !== undefined || 'sw' in resolvedSearchParams);

  return {
    title: 'Browse All TV Series — Luganda Translated Shows in HD | Moviebay',
    description: 'Browse all TV series on Moviebay. Stream Luganda translated series by top VJs including VJ Junior and VJ Emmy in HD quality — download or watch online free.',
    alternates: {
      canonical: 'https://s-u.in/series',
    },
    ...(isNoIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

export default function SeriesPage() {
  return null;
}
