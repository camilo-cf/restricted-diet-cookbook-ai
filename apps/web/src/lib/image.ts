/**
 * Utility to resize an image file client-side before upload.
 * Reduces bandwidth usage and storage costs while maintaining acceptable quality.
 */
export async function resizeImage(file: File, maxDim = 1200): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas context unavailable");

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject("Blob creation failed");
          // Convert back to a File object, forcing JPEG for best compression/compatibility
          const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        },
        "image/jpeg",
        0.8 // 80% quality JPEG is usually indistinguishable from 100% for photos
      );
      
      // Cleanup
      URL.revokeObjectURL(img.src);
    };
    img.onerror = (err) => reject("Image load failed");
  });
}
