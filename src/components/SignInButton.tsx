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
      <div className="flex items-center gap-4">
        <Link href="/profile">
          <Image
            src={user.photoURL || '/default-avatar.png'}
            alt="Profile"
            width={32}
            height={32}
            className="rounded-full"
          />
        </Link>
        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {isLoading ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
    >
      <Image
        src="/google-logo.png"
        alt="Google"
        width={20}
        height={20}
      />
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
} 