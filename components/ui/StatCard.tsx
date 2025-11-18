import React from 'react';
import { LucideIcon } from 'lucide-react';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
}

export default function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-textSecondary mb-1">{title}</p>
          <p className="text-3xl font-bold text-textPrimary">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 mt-1">{trend}</p>
          )}
        </div>
        <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </Card>
  );
}

