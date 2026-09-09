export default function StatCard({ label, value, sub, accent, icon: Icon }) {
  return (
    <div className="bg-surface border border-wire rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted uppercase tracking-widest font-medium">{label}</span>
        {Icon && (
          <span className="w-7 h-7 rounded-md bg-surface2 flex items-center justify-center">
            <Icon size={14} style={{ color: accent || 'var(--muted)' }} strokeWidth={1.5} />
          </span>
        )}
      </div>
      <div>
        <p
          className="font-display text-3xl font-semibold leading-none"
          style={{ color: accent || 'var(--ink)' }}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}
