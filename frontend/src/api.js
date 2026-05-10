// src/api.js
import { clearSession } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const PUBLIC_PATHS = new Set(["/login", "/register", "/logout", "/health"]);

const request = async (path, { method = "GET", body } = {}) => {
  const opts = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_URL}${path}`, opts);
  if (response.status === 401 && !PUBLIC_PATHS.has(path)) {
    clearSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
  return response;
};

const json = async (response) => {
  if (response.status === 204) return null;
  return response.json();
};

export const registerUser = async (userData) =>
  json(await request("/register", { method: "POST", body: userData }));

export const loginUser = async (credentials) => {
  const response = await request("/login", { method: "POST", body: credentials });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "login failed");
  }
  return response.json();
};

export const logoutUser = async () => request("/logout", { method: "POST" });

export const getMe = async () => {
  const response = await request("/me");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("failed to load session");
  return response.json();
};

export const getProjects = async () => json(await request("/projects"));

export const getProjectDetails = async (projectId) =>
  json(await request(`/projects/${projectId}`));

export const createProject = async (projectData) =>
  json(await request("/projects/create", { method: "POST", body: projectData }));

export const addTeamMembers = async (projectId, members) =>
  json(await request(`/projects/${projectId}/team`, { method: "POST", body: members }));

export const getTasks = async (projectId, { q } = {}) => {
  const path = q ? `/tasks/${projectId}?q=${encodeURIComponent(q)}` : `/tasks/${projectId}`;
  return json(await request(path));
};

export const getProjectEvents = async (projectId, { limit = 50 } = {}) =>
  json(await request(`/projects/${projectId}/events?limit=${limit}`));

export const getComments = async (taskId) =>
  json(await request(`/tasks/${taskId}/comments`));

export const createComment = async (taskId, body) =>
  json(await request(`/tasks/${taskId}/comments`, { method: "POST", body: { body } }));

export const deleteComment = async (commentId) =>
  request(`/comments/${commentId}`, { method: "DELETE" });

export const createTask = async (taskData) =>
  json(await request("/tasks/create", { method: "POST", body: taskData }));

export const updateTask = async (taskId, taskData) =>
  request(`/tasks/${taskId}/update`, { method: "PUT", body: taskData });

export const getUsers = async () => json(await request("/users"));

export const getDashboard = async () => json(await request("/dashboard"));
