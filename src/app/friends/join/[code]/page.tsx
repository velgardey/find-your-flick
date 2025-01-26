"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface InviteInfo {
  userId: string;
  userDisplayName: string;
}

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export default function JoinFriend({ params }: PageProps) {
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const validateInvite = async () => {
      if (!user) return;

      try {
        const resolvedParams = await params;
        const response = await fetch(`/api/friends/invite/${resolvedParams.code}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Invalid or expired invite link');
        }

        const inviteData = await response.json();
        setInviteInfo(inviteData);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };

    validateInvite();
  }, [params, user]);

  const handleAcceptInvite = async () => {
    if (!user || !inviteInfo) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: inviteInfo.userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send friend request');
      }

      router.push('/friends');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign in to continue</h2>
          <p className="text-gray-400">
            You need to be signed in to accept friend invites
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 text-center"
        >
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-3/4 mx-auto mb-4" />
              <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto" />
            </div>
          ) : error ? (
            <>
              <h2 className="text-xl font-bold text-white mb-4">
                Oops! Something went wrong
              </h2>
              <p className="text-red-400 mb-6">{error}</p>
              <button
                onClick={() => router.push('/friends')}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Go back to Friends
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-4">
                Friend Invite from {inviteInfo?.userDisplayName}
              </h2>
              <p className="text-gray-400 mb-6">
                Would you like to send a friend request?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleAcceptInvite}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Send Request
                </button>
                <button
                  onClick={() => router.push('/friends')}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
} 