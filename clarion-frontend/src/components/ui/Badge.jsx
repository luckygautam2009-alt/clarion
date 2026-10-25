import React from 'react';

/**
 * Standard CLARION Badge component
 * Variants:
 *  - semantic: verified (success), amber (warning/pending), alert (danger/error), info
 *  - brand: primary (brand orange)
 *  - tiers: gold, platinum, silver
 *  - neutral: default
 */
export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-bold',
    md: 'text-xs sm:text-[13px] px-2.5 py-1 gap-1.5 font-bold',
  };

  const variantStyles = {
    verified: 'text-verified bg-verified-dim border-verified/35 font-bold',
    success: 'text-verified bg-verified-dim border-verified/35 font-bold',
    amber: 'text-[#C58B4B] bg-[#C58B4B]/14 border-[#C58B4B]/35 font-bold',
    warning: 'text-[#C58B4B] bg-[#C58B4B]/14 border-[#C58B4B]/35 font-bold',
    alert: 'text-alert bg-alert-dim border-alert/35 font-bold',
    danger: 'text-alert bg-alert-dim border-alert/35 font-bold',
    info: 'text-info bg-info-dim border-info/35 font-bold',
    primary: 'text-[#2F6F68] bg-[#2F6F68]/12 border-[#2F6F68]/30 font-bold',
    neutral: 'text-muted bg-ink-lighter border-border-strong font-bold',
    gold: 'text-[#C58B4B] bg-[#C58B4B]/14 border-[#C58B4B]/30 font-bold',
    platinum: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30 font-bold',
    silver: 'text-muted bg-ink-lighter border-border-strong font-bold',
  };

  const dotColors = {
    verified: 'bg-verified shadow-[0_0_8px_rgba(46,125,91,0.7)]',
    success: 'bg-verified shadow-[0_0_8px_rgba(46,125,91,0.7)]',
    amber: 'bg-[#C58B4B] shadow-[0_0_8px_rgba(197,139,75,0.7)]',
    warning: 'bg-[#C58B4B] shadow-[0_0_8px_rgba(197,139,75,0.7)]',
    alert: 'bg-alert shadow-[0_0_8px_rgba(196,67,58,0.7)]',
    danger: 'bg-alert shadow-[0_0_8px_rgba(196,67,58,0.7)]',
    info: 'bg-info shadow-[0_0_8px_rgba(53,111,144,0.7)]',
    primary: 'bg-[#2F6F68] shadow-[0_0_8px_rgba(47,111,104,0.7)]',
    neutral: 'bg-muted',
    gold: 'bg-[#C58B4B] shadow-[0_0_8px_rgba(197,139,75,0.7)]',
    platinum: 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.7)]',
    silver: 'bg-muted',
  };

  const chosenVariant = variantStyles[variant] || variantStyles.neutral;
  const chosenDot = dotColors[variant] || dotColors.neutral;

  return (
    <span
      className={`inline-flex items-center rounded-full border tracking-wide uppercase ${sizeStyles[size] || sizeStyles.md} ${chosenVariant} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${chosenDot} shrink-0 animate-pulse`}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
