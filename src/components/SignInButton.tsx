'use client'
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function SignInButton() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href="/profile">
          <Image
            src={user.photoURL || '/default-avatar.png'}
            alt="Profile"
            width={28}
            height={28}
            className="rounded-full w-7 h-7 sm:w-8 sm:h-8"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/default-avatar.png';
            }}
          />
        </Link>
        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Signing in...' : 'Sign Out'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
    >
      <Image
        src="/google-logo.png"
        alt="Google"
        width={16}
        height={16}
        className="w-4 h-4 sm:w-5 sm:h-5"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
      <span className="hidden xs:inline">{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
      <span className="xs:hidden">Sign in</span>
    </button>
  );
} 