import React from 'react';

/**
 * Doctor-facing editable section field for clinical history items.
 */
export default function SummarySectionEditor({
  label,
  value,
  onChange,
  placeholder = 'No clinical history reported',
  rows = 3,
  icon,
  helperText,
  disabled = false
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          {icon && <span className="text-teal-600 text-sm">{icon}</span>}
          <span>{label}</span>
        </label>
        {helperText && (
          <span className="text-[11px] text-slate-400 font-medium">{helperText}</span>
        )}
      </div>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all leading-relaxed resize-y disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  );
}
