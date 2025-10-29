import React from 'react';

interface TagProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

const colorMap = {
  default: 'bg-gray-100 text-textSecondary',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

export default function Tag({ label, variant = 'default', size = 'sm' }: TagProps) {
  const sizeStyles = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1';
  
  return (
    <span className={`inline-block rounded-full font-medium ${colorMap[variant]} ${sizeStyles}`}>
      {label}
    </span>
  );
}

