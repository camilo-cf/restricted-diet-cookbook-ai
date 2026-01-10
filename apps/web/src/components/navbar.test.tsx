import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
    await waitFor(() => {
        expect(screen.getByText(/Restricted Diet/i)).toBeInTheDocument();
    });
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
    });
  });

  it("opens mobile menu and shows links", async () => {
    (api.GET as any).mockResolvedValue({ data: null, error: { status: 401 } });
    render(<Navbar />);
    
    // Wait for initial render and effect
    await waitFor(() => {
        expect(screen.getByLabelText("Menu")).toBeInTheDocument();
    });

    const menuButton = screen.getByLabelText("Menu");
    fireEvent.click(menuButton);
    
    await waitFor(() => {
        expect(screen.getByText(/Browse Recipes/i)).toBeInTheDocument();
        expect(screen.getByText(/Create Recipe/i)).toBeInTheDocument();
    });
  });

  it("handles logout", async () => {
    const mockUser = {
        id: "1",
        full_name: "John Doe",
        email: "john@example.com",
        profileImageUrl: null,
    };
    (api.GET as any).mockResolvedValue({ data: mockUser, error: null });
    (api.POST as any).mockResolvedValue({ data: null, error: null });

    // Mock window.location properly to avoid lint errors
    const location = new URL("http://localhost");
    const mockLocation = {
        ...location,
        href: "http://localhost",
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
    };
    
    // Use Object.defineProperty to bypass readonly limitation and type issues
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
        configurable: true,
        value: mockLocation,
    });

    render(<Navbar />);
    
    await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    // Logout button has an icon. We find it by clicking the button that isn't the mobile one and has an icon
    const logoutButtons = screen.getAllByRole("button").filter(b => b.querySelector("svg") && !b.className.includes("sm:hidden"));
    // The button after John Doe
    if (logoutButtons.length > 0) {
        fireEvent.click(logoutButtons[0]);
    }

    await waitFor(() => {
        expect(api.POST).toHaveBeenCalledWith("/auth/logout");
        expect(window.location.href).toBe("/");
    });

    // Restore location
    Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
    });
  });
});
