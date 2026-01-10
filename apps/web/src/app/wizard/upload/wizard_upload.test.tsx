import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UploadPage from "./page";
import { vi, describe, it, expect, beforeEach } from "vitest";
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
  },
}));

// Mock image resize
vi.mock("@/lib/image", () => ({
  resizeImage: vi.fn(async (f) => f),
}));

describe("UploadPage", () => {
  const mockPush = vi.fn();
  const mockBack = vi.fn();
  const mockUpdateData = vi.fn();
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush, back: mockBack });
    (useWizard as any).mockReturnValue({ data: {}, updateData: mockUpdateData });
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  it("renders correctly", () => {
    render(<UploadPage />);
    expect(screen.getByText(/Have a photo/i)).toBeInTheDocument();
  });

  it("handles file selection and upload", async () => {
    (api.POST as any).mockImplementation((path: string) => {
        if (path === "/uploads/presign") {
            return Promise.resolve({ data: { uploadUrl: "http://put", uploadId: "img-123", imageUrl: "http://img" }, error: null });
        }
        if (path === "/uploads/complete") {
            return Promise.resolve({ data: { status: "ok" }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
    });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));

    render(<UploadPage />);
    
    const file = new File(["content"], "ingredients.jpg", { type: "image/jpeg" });
    const input = screen.getByTestId("file-upload");
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(resizeImage).toHaveBeenCalled();
      expect(api.POST).toHaveBeenCalledWith("/uploads/presign", expect.anything());
      expect(fetch).toHaveBeenCalledWith("http://put", expect.anything());
      expect(api.POST).toHaveBeenCalledWith("/uploads/complete", { body: { uploadId: "img-123" } });
      expect(mockUpdateData).toHaveBeenCalledWith(expect.objectContaining({
          photoKey: "ingredients.jpg",
          uploadId: "img-123",
          photoPreview: "http://img"
      }));
      expect(mockToast).toHaveBeenCalledWith("Photo uploaded and optimized successfully!", "success");
    });
  });

  it("handles file removal", () => {
    (useWizard as any).mockReturnValue({ 
        data: { photoPreview: "http://img", photoKey: "test.jpg" }, 
        updateData: mockUpdateData 
    });

    render(<UploadPage />);
    
    // The button simply says "Remove" with an X icon
    const removeBtn = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtn);

    expect(mockUpdateData).toHaveBeenCalledWith({ photoKey: undefined, uploadId: undefined, photoPreview: undefined });
    expect(mockToast).toHaveBeenCalledWith("Image removed.", "info");
  });

  it("navigates back and forward", () => {
      render(<UploadPage />);
      
      fireEvent.click(screen.getByRole("button", { name: /Back/i }));
      expect(mockBack).toHaveBeenCalled();
      
      // Initially it's "Skip & Review" when no photo
      fireEvent.click(screen.getByRole("button", { name: /Skip & Review/i }));
      expect(mockPush).toHaveBeenCalledWith("/wizard/review");
  });

  it("navigates with photo", () => {
      (useWizard as any).mockReturnValue({ 
        data: { photoPreview: "http://img", photoKey: "test.jpg" }, 
        updateData: mockUpdateData 
      });

      render(<UploadPage />);
      
      // Button changes to "Continue with Photo"
      fireEvent.click(screen.getByRole("button", { name: /Continue with Photo/i }));
      expect(mockPush).toHaveBeenCalledWith("/wizard/review");
  });
});
