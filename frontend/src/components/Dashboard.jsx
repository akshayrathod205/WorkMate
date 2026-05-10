import { useQuery } from "@tanstack/react-query";
import { Folder, ListTodo, CheckCircle2, Clock } from "lucide-react";
import { getDashboard } from "../api";
import { PageContainer } from "./ui/PageContainer";
import { Skeleton } from "./ui/Skeleton";
import { StatCard } from "./dashboard/StatCard";
import { StatusDonut } from "./dashboard/StatusDonut";
import { TasksPerProjectBar } from "./dashboard/TasksPerProjectBar";

const Dashboard = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">An overview of your projects and tasks.</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div className="card p-8 text-center text-sm text-red-600">Failed to load dashboard.</div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Projects" value={data.totals.projects} icon={Folder} />
            <StatCard label="Tasks" value={data.totals.tasks} icon={ListTodo} />
            <StatCard label="In progress" value={data.totals.in_progress} icon={Clock} accent="text-amber-600" />
            <StatCard label="Completed" value={data.totals.completed} icon={CheckCircle2} accent="text-emerald-600" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StatusDonut totals={data.totals} />
            <TasksPerProjectBar rows={data.tasks_by_project} />
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default Dashboard;
