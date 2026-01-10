import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Button } from "./button";
import { Badge } from "./badge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./card";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { GlobalErrorBanner } from "./GlobalErrorBanner";

describe("UI Components", () => {
  describe("Button", () => {
    it("renders with text", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button", { name: /Click me/i })).toBeInTheDocument();
    });

    it("handles click", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      fireEvent.click(screen.getByRole("button", { name: /Click me/i }));
      expect(handleClick).toHaveBeenCalled();
    });

    it("renders with different variants", () => {
        const { rerender } = render(<Button variant="destructive">Delete</Button>);
        expect(screen.getByRole("button")).toHaveClass("bg-destructive");
        
        rerender(<Button variant="outline">Outline</Button>);
        expect(screen.getByRole("button")).toHaveClass("border-input");
        
        rerender(<Button variant="ghost">Ghost</Button>);
        expect(screen.getByRole("button")).toHaveClass("hover:bg-accent");
    });
  });

  describe("Badge", () => {
    it("renders with text", () => {
      render(<Badge>Vegan</Badge>);
      expect(screen.getByText(/Vegan/i)).toBeInTheDocument();
    });

    it("renders with different variants", () => {
        const { rerender } = render(<Badge variant="secondary">Label</Badge>);
        expect(screen.getByText(/Label/i)).toHaveClass("bg-secondary");
        
        rerender(<Badge variant="outline">Outline</Badge>);
        expect(screen.getByText(/Outline/i)).toHaveClass("text-foreground");
    });
  });

  describe("Card", () => {
    it("renders children correctly", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );
      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Content")).toBeInTheDocument();
      expect(screen.getByText("Footer")).toBeInTheDocument();
    });
  });

  describe("Input", () => {
    it("renders and accepts value", () => {
      render(<Input placeholder="Enter email" />);
      const input = screen.getByPlaceholderText("Enter email");
      fireEvent.change(input, { target: { value: "test@example.com" } });
      expect((input as HTMLInputElement).value).toBe("test@example.com");
    });
  });

  describe("Textarea", () => {
    it("renders and accepts value", () => {
      render(<Textarea placeholder="Enter instructions" />);
      const textarea = screen.getByPlaceholderText("Enter instructions");
      fireEvent.change(textarea, { target: { value: "Step 1" } });
      expect((textarea as HTMLTextAreaElement).value).toBe("Step 1");
    });
  });

  describe("GlobalErrorBanner", () => {
    beforeEach(() => {
        vi.stubGlobal("navigator", { onLine: true });
        vi.stubGlobal("location", { reload: vi.fn() });
    });

    it("renders nothing when online", () => {
      const { container } = render(<GlobalErrorBanner />);
      expect(container.firstChild).toBeNull();
    });

    it("renders message when offline", () => {
      vi.stubGlobal("navigator", { onLine: false });
      render(<GlobalErrorBanner />);
      expect(screen.getByText(/No internet connection/i)).toBeInTheDocument();
    });
    
    it("calls reload on retry click", () => {
        vi.stubGlobal("navigator", { onLine: false });
        render(<GlobalErrorBanner />);
        fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
        expect(window.location.reload).toHaveBeenCalled();
    });
  });
});
