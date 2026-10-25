import React from 'react';

/**
 * Standard CLARION Input component
 */
export default function Input({
  label,
  error,
  helperText,
  icon: Icon = null,
  rightElement = null,
  id,
  className = '',
  disabled = false,
  ...props
}) {
  const inputId = id || (label ? `clarion-input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs sm:text-[13px] font-bold text-paper"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-muted">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          disabled={disabled}
          className={`w-full bg-ink-inset border rounded-xl py-2.5 text-sm font-semibold text-paper placeholder:text-muted/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2F6F68]/30 focus:border-[#2F6F68] focus:shadow-[0_0_12px_rgba(47,111,104,0.22)] disabled:opacity-55 disabled:cursor-not-allowed ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${rightElement ? 'pr-11' : 'pr-3.5'} ${
            error
              ? 'border-alert/70 ring-1 ring-alert/30'
              : 'border-border-strong hover:border-muted/50'
          } ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center text-muted">
            {rightElement}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-alert font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
