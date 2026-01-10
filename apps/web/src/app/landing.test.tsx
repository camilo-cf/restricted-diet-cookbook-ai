import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Landing Page", () => {
  it("renders the hero section", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: /Restricted Diet/i })).toBeInTheDocument();
    expect(screen.getByText(/Cookbook AI/i)).toBeInTheDocument();
  });

  it("renders the features section", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 2, name: /How It Works/i })).toBeInTheDocument();
    expect(screen.getByText(/List Your Ingredients/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload a Photo/i)).toBeInTheDocument();
    expect(screen.getByText(/Draft with AI Support/i)).toBeInTheDocument();
    expect(screen.getByText(/Refine & Make It Yours/i)).toBeInTheDocument();
  });

  it("renders primary call-to-action buttons", () => {
    render(<Home />);
    const createBtn = screen.getByRole("link", { name: /Create Recipe/i });
    const browseBtn = screen.getByRole("link", { name: /Browse Community/i });
    
    expect(createBtn).toHaveAttribute("href", "/wizard");
    expect(browseBtn).toHaveAttribute("href", "/recipes");
  });
});
