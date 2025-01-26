'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { motion } from 'framer-motion';
import Image from 'next/image';

const PENDING_INVITE_KEY = 'pendingInviteCode';

export default function InvitePage() {
  const { code } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [inviteData, setInviteData] = useState<{ userId: string; userDisplayName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // Store the invite code when the component mounts
    if (code && !user && !authLoading) {
      localStorage.setItem(PENDING_INVITE_KEY, code as string);
    }
  }, [code, user, authLoading]);

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

  useEffect(() => {
    // Check for pending invite after sign in
    if (user && !authLoading) {
      const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
      if (pendingInvite) {
        localStorage.removeItem(PENDING_INVITE_KEY);
        // Only redirect if we're not already on the correct page
        if (pendingInvite !== code) {
          router.push(`/friends/invite/${pendingInvite}`);
        }
      }
    }
  }, [user, authLoading, code, router]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError('Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

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
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Oops! Something went wrong</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Sign in to continue</h2>
          <p className="text-gray-400 mb-6">
            You need to sign in to accept this friend invite. Don&apos;t worry, we&apos;ll take you right back here after signing in.
          </p>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            {isSigningIn ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Image
                  src="/google-logo.png"
                  alt="Google"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                Sign in with Google
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6"
      >
        <h1 className="text-2xl font-bold text-white mb-4">Friend Invite</h1>
        {inviteData && (
          <>
            <p className="text-gray-300 mb-6">
              {inviteData.userDisplayName} would like to be your friend
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleAcceptInvite}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
              >
                Decline
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
} 