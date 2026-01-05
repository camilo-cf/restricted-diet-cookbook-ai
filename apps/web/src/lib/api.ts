import createClient from "openapi-fetch";
import type { paths } from "@cookbook/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = createClient<paths>({
  baseUrl: API_URL,
});

// Helper for presigned upload PUT which is outside the OpenAPI spec usually
// or if we want to bypass the typed client for raw binary uploads
export const uploadToPresignedUrl = async (url: string, file: File) => {
  const response = await fetch(url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to storage");
  }

  return response;
};
