'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { LuLock } from 'react-icons/lu';

export default function AuthErrorPage() {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const redirectPath = localStorage.getItem('redirectPath') || '/';
      localStorage.removeItem('redirectPath');
      router.push(redirectPath);
    }
  }, [user, router]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-black via-gray-900 to-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/[0.05] backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/10">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20"
              />
              <div className="absolute inset-1 rounded-full bg-black" />
              <div className="absolute inset-0 flex items-center justify-center">
                <LuLock className="w-10 h-10 text-gray-400" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Authentication Required</h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Please sign in to access this feature
            </p>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignIn}
            className="w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 
                     text-white rounded-xl py-4 px-6 flex items-center justify-center gap-3 
                     backdrop-blur-sm border border-white/10 transition-all duration-300"
          >
            <Image
              src="/google-logo.png"
              alt="Google"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <span>Continue with Google</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
} 