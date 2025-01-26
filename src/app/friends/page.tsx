"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { LuCopy, LuCheck, LuUserPlus } from 'react-icons/lu';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/api';

interface Friend {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  email: string;
}

interface FriendRequest {
  id: string;
  sender: {
    id: string;
    displayName: string | null;
    photoURL: string | null;
  };
}

export default function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;
      
      try {
        const [friendsData, requestsData] = await Promise.all([
          fetchWithAuth('/api/friends'),
          fetchWithAuth('/api/friends/requests')
        ]);

        setFriends(friendsData);
        setFriendRequests(requestsData);
        setError(null);
      } catch (error) {
        console.error('Error fetching friends:', error);
        setError(error instanceof Error ? error.message : 'Failed to load friends');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  const generateInviteLink = async () => {
    try {
      const { inviteLink } = await fetchWithAuth('/api/friends/invite', {
        method: 'POST',
      });
      setInviteLink(inviteLink);
      setError(null);
    } catch (error) {
      console.error('Error generating invite link:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate invite link');
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetchWithAuth(`/api/friends/requests/${requestId}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });

      if (action === 'accept') {
        setFriends(prev => [...prev, response]);
      }
      
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      setError(null);
    } catch (error) {
      console.error('Error handling friend request:', error);
      setError(error instanceof Error ? error.message : 'Failed to handle friend request');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign in to manage friends</h2>
          <p className="text-gray-400">Connect with friends and see what they&apos;re watching.</p>
        </div>
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
            onClick={() => window.location.reload()}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Friends</h2>
          <button
            onClick={generateInviteLink}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
          >
            <LuUserPlus className="w-5 h-5" />
            Invite Friend
          </button>
        </div>

        {inviteLink && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4 mb-8"
          >
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="bg-transparent text-gray-300 flex-1 mr-4"
              />
              <button
                onClick={copyInviteLink}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {copied ? <LuCheck className="w-5 h-5" /> : <LuCopy className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        )}

        {friendRequests.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-white mb-4">Friend Requests</h3>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {friendRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Image
                          src={request.sender.photoURL || '/default-avatar.png'}
                          alt={request.sender.displayName || 'Unknown User'}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <span className="font-medium text-white">
                          {request.sender.displayName || 'Unknown User'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleFriendRequest(request.id, 'accept')}
                          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleFriendRequest(request.id, 'reject')}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium text-white mb-4">Your Friends</h3>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4 animate-pulse"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-700 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded w-1/4" />
                      <div className="h-3 bg-gray-700 rounded w-1/3 mt-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No friends yet</p>
              <p className="text-sm text-gray-500">
                Generate an invite link to add friends
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friends.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/profile/${friend.id}`}
                  className="bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4 transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center space-x-4">
                    <Image
                      src={friend.photoURL || '/default-avatar.png'}
                      alt={friend.displayName || 'Unknown User'}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div>
                      <div className="font-medium text-white">
                        {friend.displayName || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {friend.email}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 