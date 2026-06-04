import { Metadata } from 'next';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const isNoIndex = resolvedSearchParams && (resolvedSearchParams.sw !== undefined || 'sw' in resolvedSearchParams);

  return {
    title: 'Original English Movies — Stream Hollywood Films in HD | Moviebay',
    description: 'Watch original English movies on Moviebay. Stream Hollywood blockbusters and indie films in HD quality — download or watch online with no subscription required.',
    alternates: {
      canonical: 'https://s-u.in/originals',
    },
    ...(isNoIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

export default function OriginalsPage() {
  return null;
}
