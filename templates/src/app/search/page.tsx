import { Metadata } from 'next';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const isNoIndex = resolvedSearchParams && (resolvedSearchParams.sw !== undefined || 'sw' in resolvedSearchParams);

  return {
    title: 'Search Movies & Series — Find Luganda Translated Films | Moviebay',
    description: 'Search thousands of Luganda translated movies and TV series on Moviebay. Find films by VJ Junior, VJ Emmy, VJ Ice P and more — stream or download instantly.',
    alternates: {
      canonical: 'https://s-u.in/search',
    },
    ...(isNoIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

export default function SearchPage() {
  return null;
}
