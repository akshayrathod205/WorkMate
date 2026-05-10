import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import * as api from "../api";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe("Login", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("renders email and password inputs", () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it("stores name and role in localStorage on successful login", async () => {
    vi.spyOn(api, "loginUser").mockResolvedValue({ name: "Alice", role: "Manager" });

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "longenough" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(localStorage.getItem("name")).toBe("Alice");
      expect(localStorage.getItem("role")).toBe("Manager");
    });
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("alerts on failed login", async () => {
    vi.spyOn(api, "loginUser").mockRejectedValue(new Error("bad creds"));
    const alertSpy = vi.spyOn(window, "alert");

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: "x@x.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "longenough" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Login failed!"));
    expect(localStorage.getItem("name")).toBeNull();
  });
});
