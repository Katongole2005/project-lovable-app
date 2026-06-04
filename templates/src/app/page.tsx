import { Metadata } from 'next';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  if (resolvedSearchParams && (resolvedSearchParams.sw !== undefined || 'sw' in resolvedSearchParams)) {
    return {
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  return {};
}

export default function HomePage() {
  return null;
}
