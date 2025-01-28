'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

const PENDING_INVITE_KEY = 'pendingInviteCode';

export default function InvitePage() {
  const { code } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Store the invite code and current URL before redirecting
        localStorage.setItem(PENDING_INVITE_KEY, code as string);
        localStorage.setItem('redirectPath', window.location.pathname);
        router.push('/auth/error');
        return;
      }

      const handleInvite = async () => {
        try {
          const token = await user.getIdToken();
          const response = await fetch('/api/friends/invite/accept', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ inviteCode: code }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to accept invite');
          }

          // Redirect to friends page on success
          router.push('/friends');
        } catch (error) {
          console.error('Error accepting invite:', error);
          setError(error instanceof Error ? error.message : 'Failed to accept invite');
        } finally {
          setLoading(false);
        }
      };

      handleInvite();
    }
  }, [code, user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-400 animate-pulse">Processing invite...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.05] backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/10 max-w-md w-full"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center"
            >
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">Invite Error</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/friends')}
              className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 
                       text-white rounded-xl py-3 px-6 inline-flex items-center justify-center
                       backdrop-blur-sm border border-white/10 transition-all duration-300"
            >
              Go to Friends
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
} 