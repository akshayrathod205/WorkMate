import { z } from "zod";
import { ROLE_MANAGER, ROLE_TEAM_MEMBER, TASK_STATUSES } from "./auth";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().email("Enter a valid email").max(150),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum([ROLE_MANAGER, ROLE_TEAM_MEMBER]),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  assigned_to: z.coerce.number().int().positive("Pick an assignee"),
  status: z.enum(TASK_STATUSES),
});
