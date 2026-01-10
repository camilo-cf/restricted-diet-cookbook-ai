import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ResultPage from "./page";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useWizard } from "@/context/wizard-context";
import { useToast } from "@/components/ui/Toast";
import { resizeImage } from "@/lib/image";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
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
    POST: vi.fn(),
    PATCH: vi.fn(),
  },
}));

// Mock image resize
vi.mock("@/lib/image", () => ({
  resizeImage: vi.fn(async (f) => f),
}));

describe("ResultPage", () => {
  const mockPush = vi.fn();
  const mockReset = vi.fn();
  const mockUpdateData = vi.fn();
  const mockToast = vi.fn();
  const mockRecipe = {
    id: "recipe-123",
    title: "AI Pasta",
    description: "Tasty",
    ingredients: ["Pasta", "Sauce"],
    instructions: ["Step 1", "Step 2"],
    dietaryTags: ["Vegan"],
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useWizard as any).mockReturnValue({ 
        data: { generatedRecipe: mockRecipe, uploadId: "upload-1", photoPreview: "http://preview" }, 
        updateData: mockUpdateData, 
        reset: mockReset 
    });
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders generated recipe and allows editing", () => {
    render(<ResultPage />);
    
    expect(screen.getByDisplayValue(/AI Pasta/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Tasty/i)).toBeInTheDocument();
    
    fireEvent.change(screen.getByPlaceholderText(/Recipe Title/i), { target: { value: "Updated Title" } });
    expect(screen.getByDisplayValue(/Updated Title/i)).toBeInTheDocument();
  });

  it("handles saving the recipe", async () => {
    vi.useFakeTimers();
    (api.PATCH as any).mockResolvedValue({ data: { status: "ok" }, error: null });

    render(<ResultPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    // Wait for the PATCH promise and advance timers for the redirect
    await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
    });

    expect(api.PATCH).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Recipe saved successfully! Redirecting...", "success");
    expect(mockReset).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/recipes/recipe-123");
  });

  it("handles dish photo upload", async () => {
      // Ensure no initial photo so upload area is visible
      (useWizard as any).mockReturnValue({ 
        data: { generatedRecipe: mockRecipe, uploadId: undefined, photoPreview: undefined }, 
        updateData: mockUpdateData, 
        reset: mockReset 
      });

      (api.POST as any).mockImplementation((path: string) => {
        if (path === "/uploads/presign") return Promise.resolve({ data: { uploadUrl: "http://put", uploadId: "new-dish", imageUrl: "http://new" }, error: null });
        if (path === "/uploads/complete") return Promise.resolve({ data: { status: "ok" }, error: null });
        return Promise.resolve({ data: null, error: null });
      });
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));

      render(<ResultPage />);
      
      const file = new File(["content"], "dish.jpg", { type: "image/jpeg" });
      const input = screen.getByTestId("dish-upload");
      
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
          expect(resizeImage).toHaveBeenCalled();
          expect(mockToast).toHaveBeenCalledWith("Photo updated successfully!", "success");
          expect(mockUpdateData).toHaveBeenCalledWith({ uploadId: "new-dish", photoPreview: "http://new" });
      });
  });
});
