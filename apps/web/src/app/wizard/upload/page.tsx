"use client";

import { useRouter } from "next/navigation";
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

  const handleFile = (file: File) => {
    // Ideally upload to S3 here and get key.
    // For now, we simulate success.
    console.log("Selected file:", file);
    setFileName(file.name);
    updateData({ photoKey: "temp-key-" + file.name }); 
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
                    SVG, PNG, JPG or GIF (max. 800x400px)
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
