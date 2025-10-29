import React from 'react';
import Card from './Card';
import Tag from './Tag';
import Button from './Button';
import { Briefcase, MapPin, Building2 } from 'lucide-react';

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  logo?: string;
  status?: string;
  onClick?: () => void;
}

export default function JobCard({ title, company, location, type, logo, status = 'Applied', onClick }: JobCardProps) {
  return (
    <Card hover className="cursor-pointer" onClick={onClick}>
      <div className="flex items-start gap-4">
        {logo ? (
          <img src={logo} alt={company} className="w-12 h-12 rounded-lg object-cover" />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-textSecondary" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-textPrimary mb-1">{title}</h3>
          <p className="text-sm text-textSecondary mb-2">{company}</p>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-textSecondary">
              <MapPin className="w-3 h-3" />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-textSecondary">
              <Briefcase className="w-3 h-3" />
              <span>{type}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Tag label={status} variant={status === 'Offer' ? 'success' : status === 'Rejected' ? 'danger' : 'default'} />
            <Button variant="outline" size="sm">View</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

