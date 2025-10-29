import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', hover = false, onClick }: CardProps) {
  const hoverStyles = hover ? 'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5' : '';
  
  return (
    <div className={`bg-white rounded-card shadow-card p-6 ${hoverStyles} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

