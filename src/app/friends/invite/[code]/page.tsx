'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function InvitePage() {
  const { code } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [inviteData, setInviteData] = useState<{ userId: string; userDisplayName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateInvite = async () => {
      if (!user || authLoading) return;

      try {
        // First ensure the user exists in the database
        const userResponse = await fetch('/api/users/me', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          }),
        });

        if (!userResponse.ok) {
          throw new Error('Failed to sync user data');
        }

        const response = await fetch(`/api/friends/invite/${code}`, {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to validate invite');
        }

        const data = await response.json();
        setInviteData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    validateInvite();
  }, [code, user, authLoading]);

  const handleAcceptInvite = async () => {
    if (!user || !inviteData) return;

    try {
      const response = await fetch('/api/friends/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          inviteCode: code,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept invite');
      }

      router.push('/friends');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          You need to be signed in to accept friend invites.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Friend Invite</h1>
        {inviteData && (
          <>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {inviteData.userDisplayName} would like to be your friend
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleAcceptInvite}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Decline
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 