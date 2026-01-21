'use client';

import { useClientDictionary } from '@/hooks/use-client-dictionary';
import '@/styles/loader.css';

export const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-white to-zinc-50">
    <div className="flex flex-col items-center gap-4">
      <svg className="pl" width="240" height="240" viewBox="0 0 240 240">
        <circle
          className="pl__ring pl__ring--a"
          cx="120"
          cy="120"
          r="105"
          fill="none"
          strokeWidth="20"
          strokeDasharray="0 660"
          strokeDashoffset="-330"
          strokeLinecap="round"
        />
        <circle
          className="pl__ring pl__ring--b"
          cx="120"
          cy="120"
          r="35"
          fill="none"
          strokeWidth="20"
          strokeDasharray="0 220"
          strokeDashoffset="-110"
          strokeLinecap="round"
        />
        <circle
          className="pl__ring pl__ring--c"
          cx="85"
          cy="120"
          r="70"
          fill="none"
          strokeWidth="20"
          strokeDasharray="0 440"
          strokeLinecap="round"
        />
        <circle
          className="pl__ring pl__ring--d"
          cx="155"
          cy="120"
          r="70"
          fill="none"
          strokeWidth="20"
          strokeDasharray="0 440"
          strokeLinecap="round"
        />
      </svg>
    </div>
  </div>
);

export default function PageLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useClientDictionary();

  if (isLoading) {
    return <PageSpinner />;
  }

  return <>{children}</>;
}
