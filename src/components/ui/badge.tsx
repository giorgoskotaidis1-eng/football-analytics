'use client';

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const variantClasses = {
    default: 'bg-emerald-600 text-white border-transparent',
    secondary: 'bg-slate-100 text-slate-900 border-transparent dark:bg-slate-800 dark:text-slate-100',
    outline: 'border-slate-300 text-slate-900 dark:border-slate-700 dark:text-slate-100',
    destructive: 'bg-red-600 text-white border-transparent',
  }
  
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }


import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const variantClasses = {
    default: 'bg-emerald-600 text-white border-transparent',
    secondary: 'bg-slate-100 text-slate-900 border-transparent dark:bg-slate-800 dark:text-slate-100',
    outline: 'border-slate-300 text-slate-900 dark:border-slate-700 dark:text-slate-100',
    destructive: 'bg-red-600 text-white border-transparent',
  }
  
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }

