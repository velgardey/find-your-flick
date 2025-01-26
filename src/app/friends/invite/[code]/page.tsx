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
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  useEffect(() => {
    // Store the invite code and current URL when the component mounts
    if (code && !user && !authLoading) {
      localStorage.setItem(PENDING_INVITE_KEY, code as string);
      // Store the full URL to handle mobile redirects better
      localStorage.setItem('lastInviteUrl', window.location.href);
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
      const lastInviteUrl = localStorage.getItem('lastInviteUrl');
      
      if (pendingInvite) {
        localStorage.removeItem(PENDING_INVITE_KEY);
        localStorage.removeItem('lastInviteUrl');
        
        // Handle mobile redirects by using the full stored URL if available
        if (lastInviteUrl) {
          window.location.href = lastInviteUrl;
        } else if (pendingInvite !== code) {
          router.push(`/friends/invite/${pendingInvite}`);
        }
      }
    }
  }, [user, authLoading, code, router]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    
    // Configure Google Sign-in for better mobile experience
    provider.setCustomParameters({
      prompt: 'select_account',
      // Enable mobile-optimized sign-in
      mobile: '1',
    });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError('Failed to sign in with Google');
      // Clear stored data on error to prevent stuck states
      localStorage.removeItem(PENDING_INVITE_KEY);
      localStorage.removeItem('lastInviteUrl');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user || !inviteData) return;

    setIsAccepting(true);
    setError(null);
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

      setAcceptSuccess(true);
      setTimeout(() => {
        router.push('/friends');
      }, 1500); // Show success state for 1.5 seconds before redirecting
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setIsAccepting(false);
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
      <div className="min-h-screen pt-16 md:pt-24 px-4 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 text-center"
        >
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Sign in Required</h2>
          <p className="text-gray-400 mb-6 text-sm md:text-base">
            You need to sign in to accept this friend invite. After signing in, you&apos;ll be automatically redirected back to this invite.
          </p>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white px-4 md:px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
          >
            {isSigningIn ? (
              <>
                <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <Image
                  src="/google-logo.png"
                  alt="Google"
                  width={20}
                  height={20}
                  className="w-4 h-4 md:w-5 md:h-5"
                />
                <span>Sign in with Google</span>
              </>
            )}
          </button>
          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-sm text-red-400"
            >
              {error}
              <button
                onClick={() => window.location.reload()}
                className="ml-2 underline hover:text-red-300"
              >
                Try again
              </button>
            </motion.p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 md:pt-24 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6"
      >
        <h1 className="text-xl md:text-2xl font-bold text-white mb-4">Friend Invite</h1>
        {inviteData && (
          <>
            <p className="text-gray-300 mb-6 text-sm md:text-base">
              {inviteData.userDisplayName} would like to be your friend
            </p>
            {error && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 mb-4 text-sm"
              >
                {error}
                <button
                  onClick={() => window.location.reload()}
                  className="ml-2 underline hover:text-red-300"
                >
                  Try again
                </button>
              </motion.p>
            )}
            {acceptSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 text-green-400 mb-4 text-sm md:text-base"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Friend request accepted!</span>
              </motion.div>
            ) : (
              <div className="flex gap-3 md:gap-4">
                <button
                  onClick={handleAcceptInvite}
                  disabled={isAccepting}
                  className="flex-1 px-3 md:px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {isAccepting ? (
                    <>
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    'Accept'
                  )}
                </button>
                <button
                  onClick={() => router.push('/')}
                  disabled={isAccepting}
                  className="flex-1 px-3 md:px-4 py-2 bg-red-500/10 hover:bg-red-500/20 disabled:bg-red-500/5 disabled:cursor-not-allowed text-red-500 rounded-lg transition-colors text-sm md:text-base"
                >
                  Decline
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
} 