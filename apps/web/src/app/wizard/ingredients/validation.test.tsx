import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import IngredientsPage from "./page";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { WizardProvider } from "@/context/wizard-context";

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
    }),
    usePathname: () => "/wizard/ingredients",
  };
});

// Mock API
vi.mock("@/lib/api", () => ({
  api: {
    POST: vi.fn(),
  },
}));

const renderWithContext = () => {
  return render(
    <WizardProvider>
      <IngredientsPage />
    </WizardProvider>
  );
};

describe("IngredientsPage Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders correctly", () => {
    renderWithContext();
    expect(screen.getByText(/What's in your pantry/i)).toBeInTheDocument();
  });

  it("triggers AI validation on submit if restrictions are present", async () => {
    (api.POST as any).mockResolvedValue({ 
        data: { issues: [{ ingredient: "milk", issue: "Not vegan", suggestion: "almond milk" }] }, 
        error: null 
    });

    renderWithContext();
    
    // Fill ingredients and restrictions
    const ingredientsInput = screen.getByPlaceholderText(/e.g. 2 eggs/i);
    const restrictionsInput = screen.getByPlaceholderText(/e.g. Gluten-free/i);
    
    fireEvent.change(ingredientsInput, { target: { value: "I have milk and flour" } });
    fireEvent.change(restrictionsInput, { target: { value: "Vegan" } });
    
    const nextButton = screen.getByText(/Next Step/i);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith("/ai/validate", expect.any(Object));
      expect(screen.getByText(/Wait, something's not right/i)).toBeInTheDocument();
      expect(screen.getByText(/Suggested:/i)).toBeInTheDocument();
    });
  });

  it("applies suggestions and proceeds", async () => {
    (api.POST as any).mockResolvedValue({ 
        data: { issues: [{ ingredient: "milk", issue: "Not vegan", suggestion: "almond milk" }] }, 
        error: null 
    });

    renderWithContext();
    
    fireEvent.change(screen.getByPlaceholderText(/e.g. 2 eggs/i), { target: { value: "I have milk and flour" } });
    fireEvent.change(screen.getByPlaceholderText(/e.g. Gluten-free/i), { target: { value: "Vegan" } });
    
    fireEvent.click(screen.getByText(/Next Step/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Apply all suggestions/i)).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText(/Apply all suggestions/i));
    
    expect(mockPush).toHaveBeenCalledWith("/wizard/upload");
  });

  it("adds restrictions via badges", async () => {
      renderWithContext();
      
      const badge = screen.getByText(/Gluten-free/i);
      fireEvent.click(badge);
      
      const restrictionsInput = screen.getByPlaceholderText(/e.g. Gluten-free/i);
      expect((restrictionsInput as HTMLInputElement).value).toBe("Gluten-free");
      
      // Add another one
      const veganBadge = screen.getByText(/Vegan/i);
      fireEvent.click(veganBadge);
      expect((restrictionsInput as HTMLInputElement).value).toBe("Gluten-free, Vegan");
  });

  it("shows validation error for empty ingredients", async () => {
      renderWithContext();
      
      const nextButton = screen.getByText(/Next Step/i);
      fireEvent.click(nextButton);
      
      // The schema min(10) error is "Please list at least a few ingredients"
      await waitFor(() => {
           expect(screen.getByText(/Please list at least a few ingredients/i)).toBeInTheDocument();
      });
  });
});
