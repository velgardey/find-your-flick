"use client";

import { Fragment, useState } from 'react';
import { Dialog, Transition, Menu } from '@headlessui/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LuHouse, LuUsers, LuRss, LuMenu, LuX, LuLogIn, LuLogOut, LuUser } from 'react-icons/lu';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import Image from 'next/image';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth();
  const [user] = useAuthState(auth);

  const navigation = [
    { name: 'Home', href: '/', icon: LuHouse, protected: false },
    { name: 'Feed', href: '/feed', icon: LuRss, protected: true },
    { name: 'Friends', href: '/friends', icon: LuUsers, protected: true },
  ];

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigation = (href: string, isProtected: boolean, e: React.MouseEvent) => {
    if (isProtected && !user) {
      e.preventDefault();
      const shouldSignIn = window.confirm('You need to sign in to access this feature. Would you like to sign in now?');
      if (shouldSignIn) {
        handleSignIn();
      }
    }
  };

  return (
    <>
      <div className="fixed top-0 z-50 w-full bg-black/50 backdrop-blur-lg border-b border-gray-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0">
                <h1 className="text-lg sm:text-xl font-bold text-white font-sol">Find Your Flick</h1>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="flex items-center space-x-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleNavigation(item.href, item.protected, e)}
                      className={`relative px-4 py-2.5 text-sm font-medium text-white rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation ${
                        isActive ? 'text-white' : 'text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="navbar-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Link>
                  );
                })}
                
                {user ? (
                  <Menu as="div" className="relative ml-3">
                    <Menu.Button className="flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 touch-manipulation">
                      <Image
                        className="h-9 w-9 rounded-full"
                        src={user.photoURL || '/default-avatar.png'}
                        alt=""
                        width={36}
                        height={36}
                        priority={true}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (img.src !== '/default-avatar.png') {
                            img.src = '/default-avatar.png';
                          }
                        }}
                      />
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl bg-black border border-gray-800 py-1 shadow-lg focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/profile"
                              className={`${
                                active ? 'bg-gray-900' : ''
                              } block px-4 py-3 text-sm text-gray-300 hover:text-white touch-manipulation`}
                            >
                              <div className="flex items-center gap-2">
                                <LuUser className="w-4 h-4" />
                                Your Profile
                              </div>
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleSignOut}
                              className={`${
                                active ? 'bg-gray-900' : ''
                              } block w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white touch-manipulation`}
                            >
                              <div className="flex items-center gap-2">
                                <LuLogOut className="w-4 h-4" />
                                Sign out
                              </div>
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <button
                    onClick={handleSignIn}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors touch-manipulation"
                  >
                    <LuLogIn className="w-4 h-4" />
                    Sign in
                  </button>
                )}
              </div>
            </div>
            <div className="md:hidden">
              <button
                type="button"
                className="text-gray-400 hover:text-white p-2.5 rounded-lg hover:bg-white/10 active:bg-white/20 touch-manipulation"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <LuMenu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 md:hidden" onClose={setMobileMenuOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-black p-6 text-left align-middle shadow-xl transition-all border border-gray-800/50">
                  <div className="absolute right-4 top-4">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white p-2.5 rounded-lg hover:bg-white/10 active:bg-white/20 touch-manipulation"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label="Close menu"
                    >
                      <LuX className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="mt-8">
                    <div className="flex flex-col space-y-2">
                      {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={(e) => {
                              handleNavigation(item.href, item.protected, e);
                              setMobileMenuOpen(false);
                            }}
                            className={`px-4 py-3.5 text-base font-medium rounded-xl touch-manipulation ${
                              isActive
                                ? 'bg-white/10 text-white'
                                : 'text-gray-300 hover:bg-white/5 active:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-5 h-5" />
                              {item.name}
                            </div>
                          </Link>
                        );
                      })}
                      
                      {user ? (
                        <>
                          <Link
                            href="/profile"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3.5 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 active:bg-white/10 rounded-xl touch-manipulation"
                          >
                            <LuUser className="w-5 h-5" />
                            Your Profile
                          </Link>
                          <button
                            onClick={() => {
                              handleSignOut();
                              setMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3.5 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 active:bg-white/10 rounded-xl touch-manipulation w-full text-left"
                          >
                            <LuLogOut className="w-5 h-5" />
                            Sign out
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            handleSignIn();
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3.5 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 active:bg-white/10 rounded-xl touch-manipulation"
                        >
                          <LuLogIn className="w-5 h-5" />
                          Sign in
                        </button>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
} 