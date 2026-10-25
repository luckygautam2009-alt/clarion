import React from 'react';

/**
 * Standard CLARION Textarea component
 */
export default function Textarea({
  label,
  error,
  helperText,
  id,
  rows = 4,
  className = '',
  disabled = false,
  ...props
}) {
  const textareaId = id || (label ? `clarion-textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs sm:text-[13px] font-bold text-paper"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        disabled={disabled}
        className={`w-full bg-ink-inset border rounded-xl p-3.5 text-sm font-semibold text-paper placeholder:text-muted/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#002E6E]/30 focus:border-[#002E6E] disabled:opacity-55 disabled:cursor-not-allowed ${
          error
            ? 'border-alert/70 ring-1 ring-alert/30'
            : 'border-border-strong hover:border-muted/50'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-alert font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
