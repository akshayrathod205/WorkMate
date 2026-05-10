import clsx from "clsx";

const styles = {
  "Not Started": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "In Progress": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export function StatusBadge({ status }) {
  return <span className={clsx("badge", styles[status] || styles["Not Started"])}>{status}</span>;
}
