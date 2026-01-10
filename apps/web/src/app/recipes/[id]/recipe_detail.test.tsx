import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecipeDetail from "./page";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useWizard } from "@/context/wizard-context";
import { useToast } from "@/components/ui/Toast";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

// Mock Wizard context
vi.mock("@/context/wizard-context", () => ({
  useWizard: vi.fn(),
}));

// Mock Toast
vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  api: {
    GET: vi.fn(),
    DELETE: vi.fn(),
  },
}));

describe("RecipeDetail", () => {
  const mockPush = vi.fn();
  const mockUpdateData = vi.fn();
  const mockToast = vi.fn();
  const mockRecipe = {
    id: "recipe-1",
    title: "Awesome Pasta",
    description: "Best pasta ever",
    ingredients: ["Pasta", "Tomato"],
    instructions: ["Boil", "Mix"],
    dietaryTags: ["Vegan"],
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    imageUrl: "http://img.jpg",
    userId: "user-1",
  };
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    role: "user",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({ id: "recipe-1" });
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useWizard as any).mockReturnValue({ updateData: mockUpdateData });
    (useToast as any).mockReturnValue({ toast: mockToast });
    (api.GET as any).mockImplementation((path: string) => {
        if (path === "/recipes/{id}") return Promise.resolve({ data: mockRecipe, error: null });
        if (path === "/auth/me") return Promise.resolve({ data: mockUser, error: null });
        return Promise.resolve({ data: null, error: null });
    });
    // Mock window.confirm
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("loads and displays recipe details", async () => {
    render(<RecipeDetail />);
    
    // Explicitly check for the heading to avoid matching image alt text
    const heading = await screen.findByRole("heading", { name: "Awesome Pasta" });
    expect(heading).toBeInTheDocument();
    
    expect(screen.getByText(/Best pasta ever/i)).toBeInTheDocument();
    // Use exact match for ingredients to avoid matching "Awesome Pasta" or "Best pasta ever"
    expect(screen.getByText("Pasta", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Tomato", { exact: true })).toBeInTheDocument();
    expect(screen.getByText(/Boil/i)).toBeInTheDocument();
    expect(screen.getByText(/Mix/i)).toBeInTheDocument();
  });

  it("shows edit and delete buttons for owner", async () => {
    render(<RecipeDetail />);
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Delete/i })).toBeInTheDocument();
    });
  });

  it("handles edit click and redirects to wizard", async () => {
    render(<RecipeDetail />);
    
    const editBtn = await screen.findByRole("button", { name: /Edit/i });
    fireEvent.click(editBtn);

    expect(mockUpdateData).toHaveBeenCalledWith(expect.objectContaining({
        ingredients: "Pasta\nTomato",
    }));
    expect(mockPush).toHaveBeenCalledWith("/wizard/result");
  });

  it("handles delete click and redirects to explorer", async () => {
    (api.DELETE as any).mockResolvedValue({ data: { status: "deleted" }, error: null });
    
    render(<RecipeDetail />);
    
    const deleteBtn = await screen.findByRole("button", { name: /Delete/i });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(api.DELETE).toHaveBeenCalledWith("/recipes/{id}", { params: { path: { id: "recipe-1" } } });
      expect(mockToast).toHaveBeenCalledWith("Recipe deleted successfully", "success");
      expect(mockPush).toHaveBeenCalledWith("/recipes");
    });
  });
});
