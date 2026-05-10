import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check } from "lucide-react";
import { addTeamMembers, getProjectDetails, getUsers } from "../api";
import { PageContainer } from "./ui/PageContainer";
import { Spinner } from "./ui/Spinner";
import { Avatar } from "./ui/Avatar";

const AddTeamMembers = () => {
  const { id } = useParams();
  const projectId = parseInt(id, 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectDetails(projectId),
  });

  const existingIds = new Set((project?.team_members ?? []).map((m) => m.id));
  const candidates = (users ?? []).filter((u) => !existingIds.has(u.id));

  const mutation = useMutation({
    mutationFn: () => addTeamMembers(projectId, Array.from(selected).map((uid) => ({ id: uid }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Team updated");
      navigate(`/projects/${projectId}`);
    },
    onError: () => toast.error("Failed to add team members"),
  });

  const toggle = (userId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <PageContainer>
      <Link to={`/projects/${projectId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:underline dark:text-slate-400">
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <div className="card mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add team members</h1>
        {project && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">to {project.name}</p>}

        {isLoading ? (
          <div className="mt-6 flex justify-center"><Spinner /></div>
        ) : candidates.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">All users are already on this team.</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-200 dark:divide-slate-800">
            {candidates.map((user) => {
              const isSelected = selected.has(user.id);
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => toggle(user.id)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Avatar name={user.name} size={36} />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{user.email} · {user.role}</div>
                    </div>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        isSelected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Link to={`/projects/${projectId}`} className="btn-secondary">Cancel</Link>
          <button
            className="btn-primary"
            disabled={selected.size === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Spinner className="text-white" /> : `Add ${selected.size || ""} member${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </PageContainer>
  );
};

export default AddTeamMembers;
