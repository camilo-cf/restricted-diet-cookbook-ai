import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  api: {
    POST: vi.fn(),
  },
}));

describe("LoginPage", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
  });

  it("renders login form", () => {
    render(<LoginPage />);
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    render(<LoginPage />);
    const submitBtn = screen.getByRole("button", { name: /Sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    });
  });

  it("handles successful login", async () => {
    (api.POST as any).mockResolvedValue({ data: { status: "ok" }, error: null });
    
    // Mock window.location properly
    const location = new URL("http://localhost");
    const mockLocation = {
        ...location,
        href: "http://localhost",
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
    };
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
        configurable: true,
        value: mockLocation,
    });

    render(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "password123" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith("/auth/login", {
        body: { username: "test@example.com", password: "password123" },
      });
      expect(window.location.href).toBe("/recipes");
    });

    Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
    });
  });

  it("handles login failure", async () => {
    (api.POST as any).mockResolvedValue({ data: null, error: { status: 401 } });
    
    render(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "password123" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });
});
