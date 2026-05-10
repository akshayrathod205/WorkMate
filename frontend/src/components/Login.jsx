import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginUser } from "../api";
import { useAuth } from "../AuthContext";
import { loginSchema } from "../schemas";
import { Spinner } from "./ui/Spinner";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values) => {
    try {
      const response = await loginUser(values);
      login({ name: response.name, role: response.role });
      toast.success("Welcome back!");
      navigate("/projects");
    } catch (err) {
      toast.error("Invalid email or password");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">WorkMate</h1>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">Welcome back. Sign in to continue.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" placeholder="you@example.com" className="input" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" placeholder="••••••••" className="input" {...register("password")} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="text-white" /> : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
