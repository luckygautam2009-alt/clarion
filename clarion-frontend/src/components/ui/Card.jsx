import React from 'react';

/**
 * Standard CLARION Card / Panel surface container
 */
export default function Card({
  title,
  subtitle,
  action,
  children,
  footer,
  variant = 'default',
  className = '',
  bodyClassName = '',
  ...props
}) {
  const variantStyles = {
    default: 'bg-ink-light border-border-strong',
    elevated: 'bg-ink-lighter border-border-strong shadow-md',
    inset: 'bg-ink-inset border-border',
  };

  return (
    <div
      className={`rounded-2xl border ${variantStyles[variant] || variantStyles.default} shadow-xs transition-colors duration-150 overflow-hidden ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-base sm:text-[17px] font-bold text-paper tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs sm:text-[13px] text-muted mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={`p-5 sm:p-6 ${bodyClassName}`}>{children}</div>
      {footer && (
        <div className="px-5 py-3.5 bg-ink-inset/50 border-t border-border flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}
