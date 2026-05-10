import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = {
  "Not Started": "#94a3b8",
  "In Progress": "#f59e0b",
  Completed: "#10b981",
};

export function StatusDonut({ totals }) {
  const data = [
    { name: "Not Started", value: totals.not_started },
    { name: "In Progress", value: totals.in_progress },
    { name: "Completed", value: totals.completed },
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tasks by status</h3>
      {total === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No tasks yet.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "rgba(15,23,42,0.95)", border: "none", color: "#fff", borderRadius: 6, fontSize: 12 }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
