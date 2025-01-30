'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuStar, LuX } from 'react-icons/lu';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => void;
  mediaTitle: string;
}

export default function RatingModal({ isOpen, onClose, onSubmit, mediaTitle }: RatingModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full sm:w-[440px] relative"
          >
            <div className="relative bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-2 top-2 sm:right-4 sm:top-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <LuX className="w-5 h-5 text-gray-400" />
              </button>

              {/* Content */}
              <div className="text-center space-y-4 sm:space-y-6 mt-2">
                <div className="space-y-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Rate this title</h2>
                  <p className="text-sm text-gray-400">
                    How would you rate <span className="text-white font-medium">{mediaTitle}</span>?
                  </p>
                </div>

                {/* Star Rating */}
                <div className="flex justify-center gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <motion.button
                      key={value}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1.5 sm:p-2"
                    >
                      <LuStar
                        className={`w-6 h-6 sm:w-8 sm:h-8 transition-colors ${
                          value <= (hoveredRating || rating)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-gray-600'
                        }`}
                      />
                    </motion.button>
                  ))}
                </div>

                {/* Rating Description */}
                <motion.p
                  key={hoveredRating || rating}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-6 text-sm font-medium"
                >
                  {(hoveredRating || rating) > 0 ? (
                    <span className="text-yellow-500">
                      {
                        [
                          'Poor',
                          'Fair',
                          'Good',
                          'Very Good',
                          'Excellent'
                        ][Math.min((hoveredRating || rating) - 1, 4)]
                      }
                    </span>
                  ) : (
                    <span className="text-gray-500">Click to rate</span>
                  )}
                </motion.p>

                {/* Submit Button */}
                <motion.button
                  onClick={handleSubmit}
                  disabled={rating === 0}
                  className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-medium transition-all ${
                    rating > 0
                      ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white hover:from-yellow-500 hover:to-yellow-400'
                      : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                  }`}
                  whileHover={rating > 0 ? { scale: 1.02 } : undefined}
                  whileTap={rating > 0 ? { scale: 0.98 } : undefined}
                >
                  Submit Rating
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 