import clsx from "clsx";

export function Skeleton({ className }) {
  return <div className={clsx("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)} />;
}
