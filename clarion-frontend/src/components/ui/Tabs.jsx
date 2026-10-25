import React from 'react';

/**
 * Standard CLARION Tabs navigation component
 */
export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1.5 p-1 rounded-xl bg-ink-inset border border-border ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange?.(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition-all duration-150 cursor-pointer select-none ${
              isActive
                ? 'bg-white dark:bg-ink-light text-[#2F6F68] dark:text-[#5F9E96] shadow-xs border border-border-strong neon-edge-teal'
                : 'text-muted hover:text-paper hover:bg-ink-light/50 border border-transparent'
            }`}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                  isActive
                    ? 'bg-[#2F6F68]/15 text-[#2F6F68] dark:text-[#5F9E96]'
                    : 'bg-ink-lighter text-muted'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
