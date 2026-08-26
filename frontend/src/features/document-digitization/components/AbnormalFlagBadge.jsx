// frontend/src/features/document-digitization/components/AbnormalFlagBadge.jsx
import React from "react";

export default function AbnormalFlagBadge({ status }) {
  switch (status) {
    case "HIGH":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
          HIGH ↑
        </span>
      );
    case "LOW":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
          LOW ↓
        </span>
      );
    case "NORMAL":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
          NORMAL
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          UNCHECKED
        </span>
      );
  }
}