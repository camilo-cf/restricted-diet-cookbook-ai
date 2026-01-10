import { render, screen, waitFor } from "@testing-library/react";
import WizardLayout from "./layout";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  api: {
    GET: vi.fn(),
  },
}));

describe("WizardLayout", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
    (usePathname as any).mockReturnValue("/wizard/ingredients");
  });

  it("redirects to login if not authenticated", async () => {
    (api.GET as any).mockResolvedValue({ data: null, error: { status: 401 } });
    
    render(<WizardLayout><div>Child Content</div></WizardLayout>);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login?from=/wizard");
    });
  });

  it("renders children when authenticated", async () => {
    (api.GET as any).mockResolvedValue({ data: { email: "test@example.com" }, error: null });
    
    render(<WizardLayout><div>Child Content</div></WizardLayout>);
    
    await waitFor(() => {
      expect(screen.getByText("Child Content")).toBeInTheDocument();
      expect(screen.getByText("Create Your Recipe")).toBeInTheDocument();
      expect(screen.getByText("Ingredients")).toBeInTheDocument();
      expect(screen.getByText("Upload Photo")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
    });
  });

  it("shows active step in progress bar", async () => {
    (api.GET as any).mockResolvedValue({ data: { email: "test@example.com" }, error: null });
    (usePathname as any).mockReturnValue("/wizard/upload");

    render(<WizardLayout><div>Content</div></WizardLayout>);

    await waitFor(() => {
      const uploadLabel = screen.getByText("Upload Photo");
      expect(uploadLabel).toHaveClass("text-primary");
    });
  });
});
