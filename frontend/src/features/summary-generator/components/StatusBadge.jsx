const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  amended: 'bg-teal-100 text-teal-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function StatusBadge({ status }) {
  const safeStatus = status || 'draft';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[safeStatus] || STATUS_STYLES.draft}`}>
      {safeStatus.replace('_', ' ')}
    </span>
  );
}