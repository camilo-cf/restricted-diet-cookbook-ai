import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider, useToast } from "./Toast";

function TestComponent() {
  const { toast } = useToast();
  return (
    <button onClick={() => toast("Test message", "success")}>
      Show Toast
    </button>
  );
}

describe("Toast Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders toast when triggered", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText("Show Toast"));
    
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("auto-dismisses toast after timeout", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Test message")).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(screen.queryByText("Test message")).not.toBeInTheDocument();
  });

  it("removes toast on close button click", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText("Show Toast"));
    const closeBtn = screen.getByRole("button", { name: "" }); // The X button
    // Actually, it has no name, let's look for the one with the X icon or just the second button
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // buttons[0] is Show Toast, buttons[1] is close
    
    expect(screen.queryByText("Test message")).not.toBeInTheDocument();
  });
  
  it("throws error when used outside provider", () => {
      // Suppress console.error for this expected error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      expect(() => render(<TestComponent />)).toThrow("useToast must be used within a ToastProvider");
      
      consoleSpy.mockRestore();
  });
});
