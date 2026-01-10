import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RootLayout from "./layout";
import WizardPage from "./wizard/page";
import { redirect } from "next/navigation";

// Mock next/font/google
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
  Outfit: () => ({ variable: "--font-outfit" }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock Components
vi.mock("@/components/navbar", () => ({
  Navbar: () => <div data-testid="navbar" />,
}));
vi.mock("@/components/ui/GlobalErrorBanner", () => ({
  GlobalErrorBanner: () => <div data-testid="error-banner" />,
}));
vi.mock("@/components/ui/Toast", () => ({
  ToastProvider: ({ children }: any) => <div data-testid="toast-provider">{children}</div>,
}));
vi.mock("@/context/wizard-context", () => ({
  WizardProvider: ({ children }: any) => <div data-testid="wizard-provider">{children}</div>,
}));

describe("Root Shell", () => {
    describe("RootLayout", () => {
        it("renders the main shell", () => {
            render(
                <RootLayout>
                    <div data-testid="child" />
                </RootLayout>
            );
            expect(document.querySelector("main")).toBeInTheDocument();
        });
    });

    describe("WizardPage Redirect", () => {
        it("redirects to ingredients", () => {
            WizardPage();
            expect(redirect).toHaveBeenCalledWith("/wizard/ingredients");
        });
    });
});
