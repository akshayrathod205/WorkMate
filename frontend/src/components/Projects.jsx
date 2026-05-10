import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, FolderPlus } from "lucide-react";
import { getProjects } from "../api";
import { useAuth } from "../AuthContext";
import { ROLE_MANAGER } from "../auth";
import { PageContainer } from "./ui/PageContainer";
import { Skeleton } from "./ui/Skeleton";
import { Avatar } from "./ui/Avatar";

const Projects = () => {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const result = await getProjects();
      return result?.projects ?? [];
    },
  });

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Projects</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {user?.role === ROLE_MANAGER ? "Projects you manage." : "Projects you're a member of."}
          </p>
        </div>
        {user?.role === ROLE_MANAGER && (
          <Link to="/create-project" className="btn-primary">
            <Plus className="h-4 w-4" />
            New project
          </Link>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <div className="mt-4 flex -space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="card p-8 text-center text-sm text-red-600">Failed to load projects. Try again later.</div>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="rounded-full bg-brand-50 p-3 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
            <FolderPlus className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">No projects yet</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {user?.role === ROLE_MANAGER ? "Create your first project to get started." : "You haven't been added to any projects yet."}
          </p>
          {user?.role === ROLE_MANAGER && (
            <Link to="/create-project" className="btn-primary mt-6">
              <Plus className="h-4 w-4" />
              Create project
            </Link>
          )}
        </div>
      )}

      {!isLoading && data?.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="card flex flex-col gap-4 p-5 transition-shadow hover:shadow-md"
            >
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</h3>
                {project.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{project.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {(project.team_members || []).slice(0, 4).map((member) => (
                    <div
                      key={member.id}
                      title={`${member.name} (${member.role})`}
                      className="rounded-full ring-2 ring-white dark:ring-slate-900"
                    >
                      <Avatar name={member.name} size={28} />
                    </div>
                  ))}
                  {(project.team_members?.length || 0) > 4 && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700 ring-2 ring-white dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-900">
                      +{project.team_members.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {project.team_members?.length || 0} member{project.team_members?.length === 1 ? "" : "s"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default Projects;
