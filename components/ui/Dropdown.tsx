'use client';

import React, { useRef, useEffect, useState } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  width?: 'normal' | 'wide';
}

export default function Dropdown({ trigger, children, align = 'right', width = 'normal' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alignClass = align === 'right' ? 'right-0' : 'left-0';
  const widthClass = width === 'wide' ? 'w-96' : 'w-80';

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div 
            className={`absolute ${alignClass} mt-2 ${widthClass} bg-white rounded-lg shadow-lg border border-gray-200 z-30 animate-in fade-in slide-in-from-top-2 duration-200`}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

