'use client'
import Link from 'next/link';
import SignInButton from './SignInButton';
import { LuHouse } from 'react-icons/lu';

export default function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link 
            href="/" 
            className="text-white/80 hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95 p-1.5 sm:p-2"
          >
            <LuHouse className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
          
          <SignInButton />
        </div>
      </div>
    </nav>
  );
}