import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createProject } from "../api";
import { projectSchema } from "../schemas";
import { PageContainer } from "./ui/PageContainer";
import { Spinner } from "./ui/Spinner";

const CreateProject = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(projectSchema), defaultValues: { description: "" } });

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
      navigate("/projects");
    },
    onError: () => toast.error("Failed to create project"),
  });

  return (
    <PageContainer>
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:underline dark:text-slate-400">
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <div className="card mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">New project</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" placeholder="e.g. Phoenix Launch" {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" className="input min-h-[100px]" placeholder="What's this project about?" {...register("description")} />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link to="/projects" className="btn-secondary">Cancel</Link>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner className="text-white" /> : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
};

export default CreateProject;
