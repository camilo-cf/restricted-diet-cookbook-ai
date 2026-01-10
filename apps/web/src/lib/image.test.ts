import { vi, describe, it, expect, beforeEach } from "vitest";
import { resizeImage } from "./image";

describe("Image Lib", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
        createObjectURL: vi.fn(() => "mock-url"),
        revokeObjectURL: vi.fn(),
    });

    // Mock Canvas and Image
    const mockCanvas = {
        getContext: vi.fn(() => ({
            drawImage: vi.fn(),
        })),
        toBlob: vi.fn((cb) => cb(new Blob(["content"], { type: "image/jpeg" }))),
        width: 0,
        height: 0,
    };

    vi.stubGlobal("document", {
        createElement: vi.fn((tag) => {
            if (tag === "img") {
                const img = {
                    onload: null as any,
                    onerror: null as any,
                    width: 2000,
                    height: 1000,
                    src: "",
                };
                // Simulate async load
                setTimeout(() => img.onload && img.onload(), 0);
                return img;
            }
            if (tag === "canvas") {
                return mockCanvas;
            }
            return {};
        }),
    });
  });

  it("resizeImage resizes landscape and renames to .jpg", async () => {
    const file = new File(["content"], "test.png", { type: "image/png" });
    const resized = await resizeImage(file, 1200);

    expect(resized.name).toBe("test.jpg");
    expect(resized.type).toBe("image/jpeg");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
  });

  it("resizeImage resizes portrait image", async () => {
    vi.stubGlobal("document", {
        createElement: vi.fn((tag) => {
            if (tag === "img") {
                const img = {
                    onload: null as any,
                    onerror: null as any,
                    width: 1000,
                    height: 2000,
                    src: "",
                };
                setTimeout(() => img.onload && img.onload(), 0);
                return img;
            }
            if (tag === "canvas") {
                return {
                    getContext: vi.fn(() => ({ drawImage: vi.fn() })),
                    toBlob: vi.fn((cb) => cb(new Blob(["content"]))),
                    width: 0,
                    height: 0,
                };
            }
            return {};
        }),
    });

    const file = new File(["content"], "port.png", { type: "image/png" });
    const resized = await resizeImage(file, 1200);
    expect(resized.name).toBe("port.jpg");
  });

  it("handles image load failure", async () => {
    vi.stubGlobal("document", {
        createElement: vi.fn((tag) => {
            if (tag === "img") {
                const img = {
                    onload: null as any,
                    onerror: null as any,
                    src: "",
                };
                setTimeout(() => img.onerror && img.onerror(new Error("fail")), 0);
                return img;
            }
            return {};
        }),
    });

    const file = new File(["content"], "test.png", { type: "image/png" });
    await expect(resizeImage(file)).rejects.toBe("Image load failed");
  });
});
