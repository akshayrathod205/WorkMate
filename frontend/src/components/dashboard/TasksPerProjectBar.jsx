import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function TasksPerProjectBar({ rows }) {
  const data = rows.map((r) => ({
    name: r.project_name,
    "Not Started": r.not_started,
    "In Progress": r.in_progress,
    Completed: r.completed,
  }));

  return (
    <div className="card p-5 lg:col-span-2">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tasks per project</h3>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No projects yet.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-slate-600 dark:text-slate-400" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-slate-600 dark:text-slate-400" />
              <Tooltip
                contentStyle={{ background: "rgba(15,23,42,0.95)", border: "none", color: "#fff", borderRadius: 6, fontSize: 12 }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Not Started" stackId="status" fill="#94a3b8" />
              <Bar dataKey="In Progress" stackId="status" fill="#f59e0b" />
              <Bar dataKey="Completed" stackId="status" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
