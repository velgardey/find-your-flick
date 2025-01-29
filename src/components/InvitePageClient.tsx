'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AlreadyFriendsDialog from '@/components/AlreadyFriendsDialog';

interface InviteData {
  userId: string;
  displayName: string;
  photoURL: string | null;
  email: string;
}

interface Friend {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  email: string;
}

interface InvitePageClientProps {
  inviteId: string;
}

export default function InvitePageClient({ inviteId }: InvitePageClientProps) {
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAlreadyFriendsDialog, setShowAlreadyFriendsDialog] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchInviteData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const data = await fetchWithAuth<InviteData>(`/api/invites/${inviteId}`);
        
        // Check if this is your own invite link
        if (data.userId === user.uid) {
          setError("This is your own invite link!");
          return;
        }

        // Check if already friends
        const friendsResponse = await fetchWithAuth<Friend[]>(`/api/users/${user.uid}/friends`);
        const isFriend = friendsResponse.some(friend => friend.id === data.userId);
        
        if (isFriend) {
          setInviteData(data);
          setShowAlreadyFriendsDialog(true);
          return;
        }

        setInviteData(data);
      } catch (error) {
        console.error('Error fetching invite data:', error);
        setError('Invalid or expired invite link');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInviteData();
  }, [inviteId, user]);

  const handleAcceptInvite = async () => {
    if (!user || !inviteData) return;

    try {
      await fetchWithAuth(`/api/friends/add`, {
        method: 'POST',
        body: JSON.stringify({
          friendId: inviteData.userId
        })
      });

      router.push(`/profile/${inviteData.userId}`);
    } catch (error) {
      console.error('Error accepting invite:', error);
      setError('Failed to accept invite');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign in to accept invites</h2>
          <p className="text-gray-400">You need to be signed in to connect with friends.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-md mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Oops!</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!inviteData) return null;

  return (
    <>
      {showAlreadyFriendsDialog ? (
        <AlreadyFriendsDialog
          friendName={inviteData.displayName}
          friendId={inviteData.userId}
          onClose={() => router.push('/')}
        />
      ) : (
        <div className="min-h-screen pt-24 px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
          >
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold">Friend Request</h2>
              <p className="text-gray-400">
                {inviteData.displayName} wants to connect with you on Find Your Flick
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptInvite}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl transition-colors"
                >
                  Accept
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
} 