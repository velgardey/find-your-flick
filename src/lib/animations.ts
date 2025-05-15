import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

// Fade in animation
export const fadeIn = (element: Element | null, delay: number = 0, duration: number = 0.6) => {
  if (!element) return;
  
  return gsap.fromTo(
    element,
    { opacity: 0, y: 20 },
    { 
      opacity: 1, 
      y: 0, 
      duration, 
      delay,
      ease: 'power2.out',
    }
  );
};

// Fade in with scale animation
export const fadeInScale = (element: Element | null, delay: number = 0, scale: number = 0.9) => {
  if (!element) return;
  
  return gsap.fromTo(
    element,
    { opacity: 0, scale },
    { 
      opacity: 1, 
      scale: 1, 
      duration: 0.6, 
      delay,
      ease: 'back.out(1.7)',
    }
  );
};

// Stagger animation for multiple elements
export const staggerElements = (
  elements: NodeListOf<Element> | Element[] | null, 
  fromVars: gsap.TweenVars = { y: 20, opacity: 0 },
  toVars: gsap.TweenVars = { y: 0, opacity: 1, duration: 0.5 }
) => {
  if (!elements || elements.length === 0) return;
  
  return gsap.fromTo(
    elements,
    fromVars,
    { 
      ...toVars, 
      stagger: 0.1,
      ease: toVars.ease || 'power2.out'
    }
  );
};

// Text reveal animation
export const revealText = (element: Element | null, delay: number = 0) => {
  if (!element || typeof window === 'undefined') return;
  
  const splitText = new SplitText(element, { type: 'chars,words' });
  
  return gsap.fromTo(
    splitText.chars,
    { 
      opacity: 0,
      y: 20,
      rotationX: -90,
    },
    { 
      opacity: 1,
      y: 0,
      rotationX: 0,
      duration: 0.8,
      stagger: 0.02,
      delay,
      ease: 'power2.out',
    }
  );
};

// Scroll-triggered animations
export const createScrollTriggers = () => {
  if (typeof window === 'undefined') return;
  
  // Fade in elements with .gsap-fade-in class
  gsap.utils.toArray<HTMLElement>('.gsap-fade-in').forEach((element) => {
    gsap.fromTo(
      element,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        scrollTrigger: {
          trigger: element,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // Stagger children with .gsap-stagger class
  gsap.utils.toArray<HTMLElement>('.gsap-stagger').forEach((staggerParent) => {
    const children = staggerParent.querySelectorAll('.gsap-stagger-item');
    if (children.length === 0) return;

    gsap.fromTo(
      children,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.5,
        scrollTrigger: {
          trigger: staggerParent,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // Scale elements with .gsap-scale class
  gsap.utils.toArray<HTMLElement>('.gsap-scale').forEach((element) => {
    gsap.fromTo(
      element,
      { scale: 0.9, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        scrollTrigger: {
          trigger: element,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        ease: 'back.out(1.2)',
      }
    );
  });
};

// Hero section animated background
export const animateHeroBackground = (element: Element | null) => {
  if (!element) return;
  
  const tl = gsap.timeline({ repeat: -1, yoyo: true });
  
  tl.to(element, { 
    backgroundPosition: '100% 100%', 
    duration: 20, 
    ease: 'none' 
  });
  
  return tl;
};

// Hover animation for cards
export const setupCardHover = (cards: NodeListOf<Element> | Element[] | null) => {
  if (!cards || cards.length === 0) return;
  
  cards.forEach(card => {
    const enterAnimation = () => {
      gsap.to(card, { 
        y: -10, 
        scale: 1.02, 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        duration: 0.3,
        ease: 'power2.out'
      });
    };
    
    const leaveAnimation = () => {
      gsap.to(card, { 
        y: 0, 
        scale: 1, 
        boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)', 
        duration: 0.3,
        ease: 'power2.out'
      });
    };
    
    card.addEventListener('mouseenter', enterAnimation);
    card.addEventListener('mouseleave', leaveAnimation);
  });
};

// Page transition animation
export const pageTransition = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Header animation (for main page load)
export const animateHeader = (header: Element | null) => {
  if (!header) return;
  
  const logo = header.querySelector('.logo');
  const navItems = header.querySelectorAll('.nav-item');
  const buttonsContainer = header.querySelector('.auth-buttons');
  
  const tl = gsap.timeline({ delay: 0.2 });
  
  tl.fromTo(logo, 
    { opacity: 0, x: -20 }, 
    { opacity: 1, x: 0, duration: 0.5 }
  );
  
  tl.fromTo(navItems, 
    { opacity: 0, y: -20 }, 
    { opacity: 1, y: 0, stagger: 0.1, duration: 0.4 }, 
    '-=0.3'
  );
  
  tl.fromTo(buttonsContainer, 
    { opacity: 0, x: 20 }, 
    { opacity: 1, x: 0, duration: 0.5 }, 
    '-=0.3'
  );
  
  return tl;
};

// Initialize all animations
export const initializeAnimations = () => {
  if (typeof window === 'undefined') return;
  
  // Create scroll triggers for elements with special classes
  createScrollTriggers();
  
  // Setup hover animations for any cards with the .gsap-card-hover class
  setupCardHover(document.querySelectorAll('.gsap-card-hover'));
  
  // Animate hero background if present
  animateHeroBackground(document.querySelector('.hero-background'));
  
  // Animate header
  animateHeader(document.querySelector('header'));
}; 