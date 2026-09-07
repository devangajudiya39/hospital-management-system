import React from 'react';

/**
 * Clean clinical container card for doctor-facing summary sections.
 */
export default function SummaryCard({
  title,
  subtitle,
  icon,
  badge,
  action,
  children,
  className = '',
  headerClassName = ''
}) {
  return (
    <section className={`bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs ${className}`}>
      {(title || icon || badge || action) && (
        <div className={`flex items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100 ${headerClassName}`}>
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-sm">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
