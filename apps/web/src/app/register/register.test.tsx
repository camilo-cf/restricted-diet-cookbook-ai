import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "./page";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  api: {
    POST: vi.fn(),
  },
}));

describe("RegisterPage", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
  });

  it("renders register form", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    render(<RegisterPage />);
    const submitBtn = screen.getByRole("button", { name: /Create Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it("shows error if passwords don't match", async () => {
    render(<RegisterPage />);
    
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "password456" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument();
    });
  });

  it("handles successful registration", async () => {
    (api.POST as any).mockResolvedValue({ data: { status: "ok" }, error: null });
    
    render(<RegisterPage />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "password123" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Welcome to the Kitchen!/i)).toBeInTheDocument();
    }, { timeout: 4000 });

    // We don't wait for the redirect here to avoid long test times, 
    // but the success message confirms the flow worked.
  });

  it("handles registration failure with detail", async () => {
    (api.POST as any).mockResolvedValue({ data: null, error: { detail: "Email already exists" } });
    
    render(<RegisterPage />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "password123" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email already exists/i)).toBeInTheDocument();
    });
  });
});
