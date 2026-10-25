import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Standard CLARION Select component
 */
export default function Select({
  label,
  error,
  helperText,
  id,
  className = '',
  disabled = false,
  children,
  ...props
}) {
  const selectId = id || (label ? `clarion-select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs sm:text-[13px] font-bold text-paper"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={selectId}
          disabled={disabled}
          className={`w-full appearance-none bg-ink-inset border rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-semibold text-paper transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#002E6E]/30 focus:border-[#002E6E] disabled:opacity-55 disabled:cursor-not-allowed ${
            error
              ? 'border-alert/70 ring-1 ring-alert/30'
              : 'border-border-strong hover:border-muted/50'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3.5 pointer-events-none text-muted">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-alert font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
