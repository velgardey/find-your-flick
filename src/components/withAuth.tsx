'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuthComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        // Store the current path for redirect after sign in
        if (typeof window !== 'undefined') {
          localStorage.setItem('redirectPath', window.location.pathname);
          // Use Next.js router for client-side navigation
          router.replace('/auth/error');
        }
      }
    }, [user, loading, router]);

    // Show loading state while checking authentication
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-400 animate-pulse">Loading...</p>
          </motion.div>
        </div>
      );
    }

    // Return null while redirecting to prevent any flash of content
    if (!user) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
} 