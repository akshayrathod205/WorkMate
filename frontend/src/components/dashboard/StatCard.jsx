export function StatCard({ label, value, icon: Icon, accent = "text-brand-600" }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      {Icon && (
        <div className={`rounded-md bg-slate-100 p-2.5 dark:bg-slate-800 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  );
}
