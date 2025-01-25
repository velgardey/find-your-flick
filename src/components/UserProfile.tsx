'use client'
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import Image from 'next/image';

export default function UserProfile() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUserProfile = useCallback(async () => {
    if (!user?.uid) return;
    
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      setUsername(data.username);
      setPhotoURL(data.photoURL);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user, loadUserProfile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    
    setLoading(true);
    try {
      const file = e.target.files[0];
      const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      
      await updateProfile(url);
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
    setLoading(false);
  };

  const updateProfile = async (newPhotoURL?: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (!username.trim()) {
        throw new Error('Username cannot be empty');
      }
  
      const userProfile: UserProfile = {
        uid: user.uid,
        username: username.trim(),
        photoURL: newPhotoURL || photoURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
  
      await setDoc(doc(db, 'users', user.uid), userProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto p-6 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-32 h-32">
          <Image
            src={photoURL || user.photoURL || '/default-avatar.png'}
            alt="Profile"
            fill
            className="rounded-full object-cover"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="absolute bottom-0 right-0 bg-white/10 p-2 rounded-full cursor-pointer hover:bg-white/20"
          >
            📷
          </label>
        </div>

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Choose a username"
          className="bg-black/30 text-white p-2 rounded-lg"
        />

        <button
          onClick={() => updateProfile()}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
} 