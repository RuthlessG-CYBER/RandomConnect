'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center flex flex-col items-center">
        <img src="/logo.jpg" alt="TikiTaka Logo" className="w-16 h-16 mb-4 shadow-sm object-cover" />
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">TikiTaka</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
