import { useRef, useEffect, ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
}

export default function Dropdown({
  isOpen,
  onClose,
  trigger,
  children,
  className = '',
  position = 'bottom'
}: DropdownProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const dropdownRect = dropdownRef.current?.getBoundingClientRect();
      
      if (!triggerRect || !dropdownRect) return;

      const viewportHeight = window.innerHeight;
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;

      let top: number;
      let maxHeight: number;

      if (position === 'bottom') {
        if (spaceBelow >= dropdownRect.height || spaceBelow >= spaceAbove) {
          // Position below
          top = triggerRect.bottom + 4; // 4px gap
          maxHeight = viewportHeight - top - 8; // 8px bottom margin
        } else {
          // Position above
          maxHeight = triggerRect.top - 8; // 8px top margin
          top = triggerRect.top - Math.min(dropdownRect.height, maxHeight) - 4; // 4px gap
        }
      } else {
        if (spaceAbove >= dropdownRect.height || spaceAbove >= spaceBelow) {
          // Position above
          maxHeight = triggerRect.top - 8; // 8px top margin
          top = triggerRect.top - Math.min(dropdownRect.height, maxHeight) - 4; // 4px gap
        } else {
          // Position below
          top = triggerRect.bottom + 4; // 4px gap
          maxHeight = viewportHeight - top - 8; // 8px bottom margin
        }
      }

      setDropdownStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${triggerRect.left}px`,
        width: `${triggerRect.width}px`,
        maxHeight: `${maxHeight}px`,
        minWidth: '200px',
        zIndex: 100
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, position]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && mounted && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`py-1 bg-black/90 backdrop-blur-xl rounded-lg shadow-lg border border-white/10 overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] ${className}`}
          style={dropdownStyle}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative inline-block w-full" ref={triggerRef}>
      {trigger}
      {mounted && createPortal(dropdownContent, document.body)}
    </div>
  );
} 