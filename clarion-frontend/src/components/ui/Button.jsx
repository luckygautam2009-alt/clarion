import React from 'react';

/**
 * Standard CLARION Button component
 * Variants: primary (#34484A), secondary, outline, destructive, ghost
 * Sizes: sm (13-14px), md (14-15px), lg (16px)
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = 'left',
  className = '',
  type = 'button',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#002E6E] focus-visible:shadow-[0_0_12px_rgba(0,186,242,0.35)] active:scale-[0.98] disabled:active:scale-100 disabled:opacity-55 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs sm:text-[13px] px-3 py-1.5 gap-1.5',
    md: 'text-sm sm:text-[14px] px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[#002E6E] text-white hover:bg-[#001F4D] shadow-xs hover:shadow-[0_4px_14px_rgba(37, 59, 61,0.25),0_0_16px_rgba(0,186,242,0.35)] border border-transparent',
    secondary:
      'bg-ink-lighter hover:bg-ink-light text-paper border border-border-strong hover:border-[#002E6E] hover:shadow-[0_0_12px_rgba(0,186,242,0.18)] shadow-2xs',
    outline:
      'bg-transparent hover:bg-teal-dim text-paper hover:text-[#002E6E] border border-border-strong hover:border-[#002E6E] hover:shadow-[0_0_12px_rgba(0,186,242,0.2)]',
    destructive:
      'bg-alert-dim text-alert hover:bg-alert hover:text-white border border-alert/30 hover:border-transparent hover:shadow-[0_0_14px_rgba(229,56,59,0.35)]',
    ghost:
      'bg-transparent hover:bg-ink-lighter text-paper-dim hover:text-paper border border-transparent',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 shrink-0" />
      )}
    </button>
  );
}
