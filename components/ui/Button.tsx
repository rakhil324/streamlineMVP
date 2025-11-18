import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const baseStyles = `${sizeStyles[size]} rounded-button font-medium transition-all duration-200`;
  
  const variants = {
    primary: 'bg-primary text-white hover:opacity-90 shadow-card',
    secondary: 'bg-gray-100 text-textPrimary hover:bg-gray-200',
    outline: 'border border-gray-300 text-textPrimary hover:bg-gray-50',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

