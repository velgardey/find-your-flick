'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LuHeart, LuX } from 'react-icons/lu';
import Link from 'next/link';

interface AlreadyFriendsDialogProps {
  friendName: string;
  friendId: string;
  onClose: () => void;
}

export default function AlreadyFriendsDialog({ friendName, friendId, onClose }: AlreadyFriendsDialogProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden border border-white/10 p-6"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <LuX className="w-5 h-5 text-gray-400" />
          </button>

          {/* Content */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <LuHeart className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold">Already Friends!</h2>
            <p className="text-gray-400">
              You and {friendName} are already connected. Want to check out their profile?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                Close
              </button>
              <Link
                href={`/profile/${friendId}`}
                className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors"
              >
                View Profile
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 