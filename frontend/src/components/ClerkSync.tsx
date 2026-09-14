'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function ClerkSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && user && !isAuthenticated && !hasSynced.current) {
      hasSynced.current = true;
      const syncWithBackend = async () => {
        try {
          const res = await api.post('/auth/clerk-sync', {
            clerkId: user.id,
            displayName: user.fullName || user.firstName || user.username || 'User',
          });
          const { user: backendUser, accessToken, refreshToken } = res.data;
          setAuth(backendUser, accessToken, refreshToken);
        } catch (error) {
          console.error('Failed to sync Clerk user with backend:', error);
          hasSynced.current = false;
        }
      };

      syncWithBackend();
    }
  }, [isLoaded, isSignedIn, user, isAuthenticated, setAuth]);

  return null;
}
