import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumbs, BreadcrumbItem } from '../ui/Breadcrumbs';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  backUrl?: string;
  backText?: string;
  action?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function PageHeader({ title, subtitle, backUrl, backText, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex flex-col items-start">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-3">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}
        {backUrl && backText && !breadcrumbs && (
          <Link to={backUrl} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors mb-2">
            <ArrowLeft size={16} className="mr-1" />
            {backText}
          </Link>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
