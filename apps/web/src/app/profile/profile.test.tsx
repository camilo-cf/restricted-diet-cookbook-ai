import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "./page";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { resizeImage } from "@/lib/image";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  api: {
    GET: vi.fn(),
    PATCH: vi.fn(),
    POST: vi.fn(),
  },
}));

// Mock Toast
vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

// Mock image resize
vi.mock("@/lib/image", () => ({
  resizeImage: vi.fn(async (f) => f),
}));

describe("ProfilePage", () => {
  const mockPush = vi.fn();
  const mockToast = vi.fn();
  const mockUser = {
    id: "1",
    full_name: "John Doe",
    email: "john@example.com",
    dietaryPreferences: ["Vegan"],
    bio: "Love cooking",
    profileImageUrl: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      refresh: vi.fn(),
    });
    (useToast as any).mockReturnValue({ toast: mockToast });
    (api.GET as any).mockResolvedValue({ data: mockUser, error: null });
  });

  it("loads and displays user profile", async () => {
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/john@example.com/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Love cooking/i)).toBeInTheDocument();
      // Check for Vegan badge, it should have specific classes
      const veganBadge = screen.getByText(/Vegan/i);
      expect(veganBadge.className).toContain("bg-emerald-600");
    });
  });

  it("handles profile update", async () => {
    (api.PATCH as any).mockResolvedValue({ data: { ...mockUser, full_name: "John Updated" }, error: null });
    
    render(<ProfilePage />);
    
    await waitFor(() => screen.getByDisplayValue(/John Doe/i));
    
    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: "John Updated" } });
    fireEvent.click(screen.getByText(/Keto/i)); // Toggle Keto
    
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(api.PATCH).toHaveBeenCalledWith("/auth/me", {
        body: expect.objectContaining({
          full_name: "John Updated",
          dietaryPreferences: expect.arrayContaining(["Vegan", "Keto"]),
        }),
      });
      expect(mockToast).toHaveBeenCalledWith("Profile updated successfully!", "success");
    });
  });

  it("handles image upload", async () => {
    (api.POST as any).mockImplementation((path: string) => {
        if (path === "/uploads/presign") {
            return Promise.resolve({ data: { uploadUrl: "http://put", uploadId: "new-img" }, error: null });
        }
        if (path === "/uploads/complete") {
            return Promise.resolve({ data: { status: "ok" }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
    });
    (api.PATCH as any).mockResolvedValue({ data: { ...mockUser, profileImageUrl: "new-url" }, error: null });
    
    // Mock fetch for PUT
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));

    render(<ProfilePage />);
    await waitFor(() => screen.getByDisplayValue(/John Doe/i));

    const file = new File(["content"], "avatar.png", { type: "image/png" });
    // Match the camera button input
    const input = screen.getByLabelText("", { selector: "input[type='file']" });
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(resizeImage).toHaveBeenCalled();
      expect(api.POST).toHaveBeenCalledWith("/uploads/presign", expect.anything());
      expect(fetch).toHaveBeenCalledWith("http://put", expect.anything());
      expect(api.POST).toHaveBeenCalledWith("/uploads/complete", { body: { uploadId: "new-img" } });
      expect(api.PATCH).toHaveBeenCalledWith("/auth/me", { body: { profileImageId: "new-img" } });
      expect(mockToast).toHaveBeenCalledWith("Avatar updated!", "success");
    });
  });

  it("handles logout", async () => {
    (api.POST as any).mockResolvedValue({ data: null, error: null });
    
    render(<ProfilePage />);
    await waitFor(() => screen.getByText(/Log Out/i));
    
    fireEvent.click(screen.getByText(/Log Out/i));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith("/auth/logout");
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });
});
