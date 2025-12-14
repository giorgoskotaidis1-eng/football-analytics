'use client';

import * as React from 'react'

// Simple icon components - can be replaced with icon library later
export function CheckCircle({ className = '', weight = 'regular', ...props }: React.SVGProps<SVGSVGElement> & { weight?: 'regular' | 'fill' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      className={className}
      {...props}
    >
      {weight === 'fill' ? (
        <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm49.53 85.84-56 56a8 8 0 0 1-11.06 0l-24-24a8 8 0 0 1 11.06-11.06L120 152.94l50.47-50.47a8 8 0 0 1 11.06 11.06Z" />
      ) : (
        <>
          <circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" strokeWidth="16" />
          <polyline points="88 128 128 168 168 128" fill="none" stroke="currentColor" strokeWidth="16" />
        </>
      )}
    </svg>
  )
}

export function Plus({ className = '', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      className={className}
      {...props}
    >
      <line x1="128" y1="40" x2="128" y2="216" stroke="currentColor" strokeWidth="16" />
      <line x1="40" y1="128" x2="216" y2="128" stroke="currentColor" strokeWidth="16" />
    </svg>
  )
}

