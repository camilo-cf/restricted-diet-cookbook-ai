import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReviewPage from "./page";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useWizard } from "@/context/wizard-context";
import { useToast } from "@/components/ui/Toast";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock Wizard context
vi.mock("@/context/wizard-context", () => ({
  useWizard: vi.fn(),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  api: {
    POST: vi.fn(),
  },
}));

// Mock Toast
vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

describe("ReviewPage", () => {
  const mockPush = vi.fn();
  const mockBack = vi.fn();
  const mockUpdateData = vi.fn();
  const mockToast = vi.fn();
  const mockData = {
    ingredients: "Tomato, Onion",
    restrictions: "Gluten-Free",
    uploadId: "img-123",
    photoKey: "fridge.jpg",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush, back: mockBack });
    (useWizard as any).mockReturnValue({ data: mockData, updateData: mockUpdateData });
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  it("renders review details from wizard context", () => {
    render(<ReviewPage />);
    expect(screen.getByText(/Tomato, Onion/i)).toBeInTheDocument();
    expect(screen.getByText(/Gluten-Free/i)).toBeInTheDocument();
    expect(screen.getByText(/Photo uploaded and ready for analysis/i)).toBeInTheDocument();
  });

  it("handles recipe generation success", async () => {
    const mockRecipe = { id: "recipe-1", title: "New Recipe" };
    (api.POST as any).mockResolvedValue({ data: mockRecipe, error: null });

    render(<ReviewPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /Generate Recipe/i }));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith("/ai/recipe", expect.objectContaining({
        body: expect.objectContaining({
          ingredients: ["Tomato", "Onion"],
          restrictions: ["Gluten-Free"],
          uploadId: "img-123"
        })
      }));
      expect(mockUpdateData).toHaveBeenCalledWith({ generatedRecipe: mockRecipe });
      expect(mockPush).toHaveBeenCalledWith("/wizard/result");
    });
  });

  it("handles generation failure", async () => {
    (api.POST as any).mockResolvedValue({ data: null, error: { detail: "Limit reached" } });

    render(<ReviewPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /Generate Recipe/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Failed to generate recipe. Please try again.", "error");
    });
  });

  it("navigates back to edit", () => {
    render(<ReviewPage />);
    
    // Test Edit buttons
    const editBtns = screen.getAllByRole("button", { name: /Edit/i });
    
    fireEvent.click(editBtns[0]); // Ingredients edit
    expect(mockPush).toHaveBeenCalledWith("/wizard/ingredients");
    
    fireEvent.click(editBtns[2]); // Photo edit
    expect(mockPush).toHaveBeenCalledWith("/wizard/upload");

    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(mockBack).toHaveBeenCalled();
  });
});
