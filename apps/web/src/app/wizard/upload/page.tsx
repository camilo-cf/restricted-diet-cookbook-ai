"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useWizard } from "@/context/wizard-context";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const { data, updateData } = useWizard();
  const [isDragging, setIsDragging] = useState(false);
  // We'll just display the file name locally for now, 
  // essentially mocking the "upload" to just selection logic until we hook up S3.
  const [fileName, setFileName] = useState<string | null>(data.photoKey ? "Previously uploaded image" : null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
  };

  // Helper to resize image client-side
  const resizeImage = (file: File, maxDim = 1200): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
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
        
        canvas.toBlob((blob) => {
            if (!blob) return reject("Blob creation failed");
            const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
            });
            resolve(resizedFile);
        }, "image/jpeg", 0.8); // 80% quality JPEG
      };
      img.onerror = (err) => reject("Image load failed");
    });
  };

  const handleFile = async (originalFile: File) => {
    try {
        // Optimize image before upload
        console.log("Optimizing image...", originalFile.size);
        const file = await resizeImage(originalFile);
        console.log("Optimized size:", file.size);

        // 1. Get Presigned URL
        const { data: presignData, error: presignError } = await api.POST("/uploads/presign", {
            body: {
                filename: file.name,
                contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
                sizeBytes: file.size
            }
        });

        if (presignError || !presignData) {
            console.error("Presign failed", presignError);
            alert("Failed to initiate upload");
            return;
        }

        // 2. Upload to S3 (MinIO)
        const uploadRes = await fetch(presignData.uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
                "Content-Type": file.type
            }
        });

        if (!uploadRes.ok) {
            console.error("Upload failed");
            alert("Failed to upload image");
            return;
        }

        // 3. Complete Upload
        const { error: completeError } = await api.POST("/uploads/complete", {
            body: { uploadId: presignData.uploadId }
        });

        if (completeError) {
             console.error("Completion failed", completeError);
             return;
        }

        // Success
        console.log("Upload success:", presignData.uploadId);
        setFileName(file.name);
        updateData({ 
            photoKey: "uploaded/" + file.name, // Display only
            uploadId: presignData.uploadId // Real ID
        }); 

    } catch (e) {
        console.error(e);
        alert("An error occurred during upload");
    }
  };

  const clearFile = () => {
      setFileName(null);
      updateData({ photoKey: undefined });
  };

  const onNext = () => {
    router.push("/wizard/review");
  };

  const onBack = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Have a photo? (Optional)</h2>
        <p className="text-muted-foreground text-sm">
          Upload a picture of your fridge or pantry, and we&apos;ll verify your ingredients!
        </p>
      </div>

      <div
        className={`
          relative border-2 border-dashed rounded-xl p-10 transition-all duration-200 ease-in-out
          flex flex-col items-center justify-center text-center cursor-pointer
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
        
        {fileName ? (
           <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
             <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
               <ImageIcon size={32} />
             </div>
             <p className="font-medium text-gray-900 mb-1">{fileName}</p>
             <p className="text-xs text-green-600 font-medium mb-4">Ready to analyze</p>
             <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
               <X className="w-4 h-4 mr-1" /> Remove
             </Button>
           </div>
        ) : (
            <>
                <div className="h-16 w-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3 transition-colors group-hover:bg-blue-100 group-hover:text-blue-500">
                    <UploadCloud size={32} />
                </div>
                <p className="font-medium text-gray-900 mb-1">
                    Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                    JPG, PNG or WEBP (optimized automatically)
                </p>
            </>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} size="lg">
          {fileName ? "Continue with Photo" : "Skip & Review"}
        </Button>
      </div>
    </div>
  );
}
