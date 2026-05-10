import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./Login";
import { AuthProvider } from "../AuthContext";
import * as api from "../api";

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("Login", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // AuthProvider calls /me on mount; stub it so it resolves quickly.
    vi.spyOn(api, "getMe").mockResolvedValue(null);
  });

  it("renders email and password inputs", () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("stores name and role on successful login", async () => {
    vi.spyOn(api, "loginUser").mockResolvedValue({ name: "Alice", role: "Manager" });

    renderLogin();
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: "alice@example.com" } });
    fireEvent.input(screen.getByLabelText(/password/i), { target: { value: "longenough" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem("name")).toBe("Alice");
      expect(localStorage.getItem("role")).toBe("Manager");
    });
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("shows validation error for invalid email", async () => {
    renderLogin();
    fireEvent.input(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } });
    fireEvent.input(screen.getByLabelText(/password/i), { target: { value: "longenough" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });
});
