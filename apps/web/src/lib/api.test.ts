import { vi, describe, it, expect, beforeEach } from "vitest";
import { uploadToPresignedUrl } from "./api";

describe("API Lib", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("uploadToPresignedUrl sends a PUT request with file", async () => {
    const mockResponse = { ok: true };
    (fetch as any).mockResolvedValue(mockResponse);

    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    const url = "http://presigned.url";
    
    await uploadToPresignedUrl(url, file);

    expect(fetch).toHaveBeenCalledWith(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  });

  it("uploadToPresignedUrl throws error on failure", async () => {
    (fetch as any).mockResolvedValue({ ok: false });

    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    await expect(uploadToPresignedUrl("url", file)).rejects.toThrow("Failed to upload file");
  });
});
