import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isHome?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const content = (
            <>
              {item.isHome && <Home className="w-4 h-4 mr-1.5" />}
              <span className={`font-medium transition-colors ${isLast ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
                {item.label}
              </span>
            </>
          );

          return (
            <li key={index} className="inline-flex items-center">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
              {item.href && !isLast ? (
                <Link to={item.href} className="inline-flex items-center">
                  {content}
                </Link>
              ) : (
                <div className="inline-flex items-center cursor-default">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
