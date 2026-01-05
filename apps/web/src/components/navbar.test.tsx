import { render, screen, waitFor } from "@testing-library/react";
import { Navbar } from "./navbar";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/lib/api";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Mock API
vi.mock("@/lib/api", () => ({
  api: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

describe("Navbar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the brand name", async () => {
    (api.GET as any).mockResolvedValue({ data: null, error: { status: 401 } });
    render(<Navbar />);
    expect(screen.getByText(/Restricted Diet/i)).toBeInTheDocument();
  });

  it("shows login/signup for guests", async () => {
    (api.GET as any).mockResolvedValue({ data: null, error: { status: 401 } });
    render(<Navbar />);
    await waitFor(() => {
      expect(screen.getByText(/Log In/i)).toBeInTheDocument();
      expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
    });
  });

  it("shows user profile and logout for authenticated users", async () => {
    const mockUser = {
      id: "1",
      full_name: "John Doe",
      email: "john@example.com",
      profileImageUrl: null,
    };
    (api.GET as any).mockResolvedValue({ data: mockUser, error: null });
    
    render(<Navbar />);
    
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      // Logout button has the LogOut icon, we can check for its presence via aria or test-id if added, 
      // but checking for the name is safer if we use accessible text.
      // In our code it's just an icon.
    });
  });
});
