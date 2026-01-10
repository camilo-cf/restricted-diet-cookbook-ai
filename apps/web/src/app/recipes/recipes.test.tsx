import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecipeExplorer from "./page";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { useSearchParams, useRouter } from "next/navigation";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  api: {
    GET: vi.fn(),
  },
}));

describe("RecipeExplorer", () => {
  const mockPush = vi.fn();
  const mockParams = new URLSearchParams();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
    (useSearchParams as any).mockReturnValue(mockParams);
  });

  it("renders with search input and dietary options", async () => {
    (api.GET as any).mockResolvedValue({ data: { data: [] }, error: null });
    
    render(<RecipeExplorer />);
    
    expect(screen.getByPlaceholderText(/Search by ingredients/i)).toBeInTheDocument();
    expect(screen.getByText(/Vegan/i)).toBeInTheDocument();
    expect(screen.getByText(/Keto/i)).toBeInTheDocument();
  });

  it("fetches recipes and displays them", async () => {
    const mockRecipes = [
      { id: "1", title: "Vegan Pasta", description: "Yummy", imageUrl: null, dietaryTags: ["Vegan"] },
    ];
    (api.GET as any).mockResolvedValue({ data: { data: mockRecipes }, error: null });

    render(<RecipeExplorer />);

    await waitFor(() => {
      expect(screen.getByText(/Vegan Pasta/i)).toBeInTheDocument();
      expect(screen.getByText(/"Yummy"/i)).toBeInTheDocument();
    });
  });

  it("handles search form submission", async () => {
    (api.GET as any).mockResolvedValue({ data: { data: [] }, error: null });
    
    render(<RecipeExplorer />);
    
    const input = screen.getByPlaceholderText(/Search by ingredients/i);
    fireEvent.change(input, { target: { value: "tofu" } });
    
    const searchBtn = screen.getByRole("button", { name: /Search/i });
    fireEvent.click(searchBtn);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("q=tofu"));
  });

  it("toggles dietary tags", async () => {
    (api.GET as any).mockResolvedValue({ data: { data: [] }, error: null });
    
    render(<RecipeExplorer />);
    
    const veganTag = screen.getByText(/Vegan/i);
    fireEvent.click(veganTag);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("dietary_tags=Vegan"));
  });

  it("shows empty state when no recipes found", async () => {
    (api.GET as any).mockResolvedValue({ data: { data: [] }, error: null });
    
    render(<RecipeExplorer />);

    await waitFor(() => {
        expect(screen.getByText(/No recipes found matching your criteria/i)).toBeInTheDocument();
    });
  });
});
