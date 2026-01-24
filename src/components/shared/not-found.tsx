'use client';

import Image from 'next/image';
import Link from 'next/link';
import TranslateText from './translate/translate-text';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <Image
        src="/404.webp"
        alt="404 Not Found"
        className="w-72 md:w-96 mb-4 select-none"
        draggable={false}
        width={384}
        height={384}
      />
      <p className="text-xs text-gray-500 mb-6">
        <TranslateText value="common.artist" /> ビン
      </p>
      <Link
        href="/"
        className="px-6 py-2 rounded-md bg-gray-900 text-white font-medium hover:bg-gray-800 transition"
      >
        <TranslateText value="common.goHome" />
      </Link>
    </div>
  );
}
