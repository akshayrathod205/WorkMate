import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { createTask, getProjectDetails } from "../api";
import { taskSchema } from "../schemas";
import { TASK_STATUSES } from "../auth";
import { PageContainer } from "./ui/PageContainer";
import { Spinner } from "./ui/Spinner";

const CreateTask = () => {
  const { id } = useParams();
  const projectId = parseInt(id, 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectDetails(projectId),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { status: TASK_STATUSES[0], description: "" },
  });

  const mutation = useMutation({
    mutationFn: (values) => createTask({ ...values, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("Task created");
      navigate(`/projects/${projectId}`);
    },
    onError: () => toast.error("Failed to create task"),
  });

  const members = project?.team_members ?? [];

  return (
    <PageContainer>
      <Link to={`/projects/${projectId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:underline dark:text-slate-400">
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <div className="card mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">New task</h1>
        {project && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">in {project.name}</p>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" className="input" placeholder="What needs to be done?" {...register("title")} />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" className="input min-h-[100px]" {...register("description")} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="assigned_to">Assignee</label>
              <select id="assigned_to" className="input" {...register("assigned_to")} defaultValue="">
                <option value="" disabled>Select a team member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {errors.assigned_to && <p className="mt-1 text-xs text-red-600">{errors.assigned_to.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" className="input" {...register("status")}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link to={`/projects/${projectId}`} className="btn-secondary">Cancel</Link>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner className="text-white" /> : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
};

export default CreateTask;
