import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerUser } from "../api";
import { ROLE_MANAGER, ROLE_TEAM_MEMBER } from "../auth";
import { registerSchema } from "../schemas";
import { Spinner } from "./ui/Spinner";

const Register = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: ROLE_TEAM_MEMBER },
  });

  const onSubmit = async (values) => {
    try {
      const response = await registerUser(values);
      if (response && response.id) {
        toast.success("Account created. Sign in to continue.");
        navigate("/login");
      } else {
        toast.error("Registration failed");
      }
    } catch (err) {
      toast.error("Registration failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">WorkMate</h1>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">Create your account.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" type="text" autoComplete="name" className="input" {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" className="input" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="new-password" className="input" {...register("password")} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="role">Role</label>
            <select id="role" className="input" {...register("role")}>
              <option value={ROLE_TEAM_MEMBER}>Team Member</option>
              <option value={ROLE_MANAGER}>Manager</option>
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="text-white" /> : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
