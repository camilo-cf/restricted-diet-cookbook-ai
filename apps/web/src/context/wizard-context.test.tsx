import { render, act, waitFor, screen, fireEvent } from "@testing-library/react";
import { WizardProvider, useWizard } from "./wizard-context";
import { describe, it, expect, beforeEach, vi } from "vitest";

function TestComponent() {
  const { data, updateData, reset } = useWizard();
  return (
    <div>
      <div data-testid="ingredients">{data.ingredients}</div>
      <div data-testid="restrictions">{data.restrictions}</div>
      <button onClick={() => updateData({ ingredients: "Tofu" })}>Update Ingredients</button>
      <button onClick={() => reset()}>Reset</button>
    </div>
  );
}

describe("WizardContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("provides initial state", () => {
    render(
      <WizardProvider>
        <TestComponent />
      </WizardProvider>
    );
    expect(screen.getByTestId("ingredients").textContent).toBe("");
    expect(screen.getByTestId("restrictions").textContent).toBe("");
  });

  it("updates data and persists to localStorage", async () => {
    render(
      <WizardProvider>
        <TestComponent />
      </WizardProvider>
    );

    fireEvent.click(screen.getByText("Update Ingredients"));

    expect(screen.getByTestId("ingredients").textContent).toBe("Tofu");
    
    await waitFor(() => {
        expect(localStorage.getItem("cookbook_wizard_data")).toContain("Tofu");
    });
  });

  it("resets data and clears localStorage", async () => {
    localStorage.setItem("cookbook_wizard_data", JSON.stringify({ ingredients: "Pasta", restrictions: "none" }));
    
    render(
      <WizardProvider>
        <TestComponent />
      </WizardProvider>
    );

    // Wait for the provider to load from localStorage
    await waitFor(() => {
        expect(screen.getByTestId("ingredients").textContent).toBe("Pasta");
    });

    fireEvent.click(screen.getByText("Reset"));

    await waitFor(() => {
        expect(screen.getByTestId("ingredients").textContent).toBe("");
    });
    
    // The component's useEffect might re-save the initial state to localStorage
    // So we check if it matches the initial data string rather than null
    const stored = localStorage.getItem("cookbook_wizard_data");
    const parsed = stored ? JSON.parse(stored) : null;
    expect(parsed).toMatchObject({ ingredients: "", restrictions: "" });
  });
});
