

"use client";

import { useWizard } from "@/context/wizard-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, Users, Save, Printer, Share2, ChefHat, Loader2, Camera, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

export default function ResultPage() {
  const router = useRouter();
  const { data, updateData } = useWizard();
  
  // Initialize state with context data or mock
  // We use snake_case check and fallback
  const initialRecipe = (data.generatedRecipe || {
    id: "mock-id", // Warning: Cannot save mock
    title: "Eco-Friendly Spinach & Cream Pasta",
    description: "A delicious, creamy pasta dish that makes perfect use of your spinach and heavy cream. Keto-friendly adjustments included.",
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    ingredients: [
      "2 cups Fresh Spinach",
      "1/2 cup Heavy Cream",
      "200g Chicken Breast (diced)",
      "1 clove Garlic (minced)",
      "2 tbsp Olive Oil",
      "Salt & Pepper to taste"
    ],
    instructions: [
      "Heat olive oil in a large skillet over medium heat.",
      "Add diced chicken breast and cook until golden brown (about 6-8 mins).",
      "Add minced garlic and sauté for 1 minute until fragrant.",
      "Lower heat and pour in heavy cream. Simmer gently until slightly thickened.",
      "Stir in fresh spinach and cook until wilted.",
      "Season with salt and pepper. Serve hot over your choice of keto pasta or zucchini noodles."
    ],
    dietaryTags: ["Keto", "Gluten-Free"],
    created_at: new Date().toISOString()
  }) as any;

  const [formData, setFormData] = useState({
      title: initialRecipe.title || "",
      description: initialRecipe.description || "",
      prepTimeMinutes: initialRecipe.prepTimeMinutes || initialRecipe.prep_time_minutes || 0,
      cookTimeMinutes: initialRecipe.cookTimeMinutes || initialRecipe.cook_time_minutes || 0,
      servings: 2, // Default, as backend might not return it
      ingredients: (initialRecipe.ingredients || []).join("\n"),
      instructions: (initialRecipe.instructions || []).join("\n"),
      dietaryTags: (initialRecipe.dietaryTags || initialRecipe.dietary_tags || []) as string[]
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resultPhotoId, setResultPhotoId] = useState<string | null>(null);

  useEffect(() => {
    // If no data and no mock intended, redirect? 
    // Commented out to allow seeing mock in dev
    // if (!data.generatedRecipe) router.push("/wizard/ingredients");
  }, [data, router]);

  const handleResultPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;
      setIsUploading(true);
      try {
          const file = e.target.files[0];
          // 1. Presign
          const { data: presignData, error: presignError } = await api.POST("/uploads/presign", {
              body: {
                  filename: file.name,
                  contentType: file.type as any,
                  sizeBytes: file.size
              }
          });
          if (presignError || !presignData) throw new Error("Presign failed");

          // 2. Upload (MinIO Local Patch)
          let uploadUrl = presignData.uploadUrl;
          const internalHosts = ["minio:9000", "cookbook-minio:9000"];
          internalHosts.forEach(host => {
              if (uploadUrl.includes(host)) {
                  uploadUrl = uploadUrl.replace(host, "localhost:9000");
              }
          });

          const uploadRes = await fetch(uploadUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type }
          });
          if (!uploadRes.ok) {
              const errorText = await uploadRes.text().catch(() => "No error body");
              console.error(`Dish upload failed: ${uploadRes.status}`, errorText);
              throw new Error(`Upload failed: ${uploadRes.status}`);
          }

          // 3. Complete
          await api.POST("/uploads/complete", {
              body: { uploadId: presignData.uploadId }
          });

          setResultPhotoId(presignData.uploadId);
      } catch (err) {
          console.error(err);
          alert("Failed to upload photo.");
      } finally {
          setIsUploading(false);
      }
  };

  const handleSave = async () => {
      if (!data.generatedRecipe?.id) {
          alert("Cannot save (Mock Mode or Missing ID)");
          return;
      }
      setIsSaving(true);
      try {
          const { error } = await api.PATCH("/recipes/{id}", {
              params: { path: { id: data.generatedRecipe.id } },
              body: {
                  title: formData.title,
                  description: formData.description,
                  prepTimeMinutes: Number(formData.prepTimeMinutes),
                  cookTimeMinutes: Number(formData.cookTimeMinutes),
                  ingredients: formData.ingredients.split("\n").filter((line: string) => line.trim() !== ""),
                  instructions: formData.instructions.split("\n").filter((line: string) => line.trim() !== ""),
                  dietaryTags: formData.dietaryTags,
                  uploadId: resultPhotoId || undefined
              } as any
          });
          
          if (error) throw error;
          alert("Recipe saved successfully!");
      } catch (e: any) {
          console.error(e);
          alert("Failed to save changes.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleStartOver = () => {
    // Should likely confirm if unsaved changes?
    router.push("/wizard/ingredients");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header Section */}
      <div className="text-center space-y-4">
        <Badge variant="secondary" className="mb-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            <CheckCircle size={14} className="mr-1" /> Draft Ready for Refinement
        </Badge>
        
        <div className="max-w-md mx-auto">
             <Input 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="text-3xl md:text-3xl font-bold text-center border-none shadow-none focus-visible:ring-0 bg-transparent h-auto p-0 placeholder:text-gray-300"
                placeholder="Recipe Title"
             />
        </div>

        <div className="max-w-lg mx-auto">
            <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="text-center text-muted-foreground border-none resize-none shadow-none focus-visible:ring-0 bg-transparent min-h-[60px]"
                placeholder="Add a description..."
            />
        </div>
      </div>

      <Card className="border shadow-md overflow-hidden bg-white/90 backdrop-blur-sm">
        {/* Result Photo Upload Area */}
        <div className="bg-emerald-50/30 border-b p-6 flex flex-col items-center justify-center border-emerald-100/50">
            {resultPhotoId ? (
                <div className="relative group w-full max-w-md">
                    <div className="h-64 w-full rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                        <img 
                            src={`http://localhost:9000/recipes/${resultPhotoId}`}
                            alt="Your dish"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute -top-2 -right-2 rounded-full h-8 w-8 shadow-lg"
                        onClick={() => setResultPhotoId(null)}
                    >
                        <X size={14} />
                    </Button>
                </div>
            ) : (
                <div className="text-center py-4">
                    <label className="cursor-pointer group flex flex-col items-center">
                        <div className="h-16 w-16 bg-white text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform duration-300">
                            {isUploading ? <Loader2 className="animate-spin" /> : <Camera size={28} />}
                        </div>
                        <span className="font-bold text-emerald-900">Show us your masterpiece!</span>
                        <span className="text-sm text-emerald-600/70">Upload a photo of your cooked dish</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleResultPhoto} disabled={isUploading} />
                    </label>
                </div>
            )}
        </div>

        {/* Metadata Row */}
        <CardHeader className="bg-slate-50 border-b py-4">
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 text-sm font-medium text-slate-600">
                
                {/* Time */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border shadow-sm">
                    <Clock size={16} className="text-emerald-500" /> 
                    <div className="flex items-center gap-1">
                        <Input 
                            type="number" 
                            className="w-12 h-6 p-0 text-center border-none bg-transparent"
                            value={formData.prepTimeMinutes + formData.cookTimeMinutes}
                            onChange={(e) => {
                                // Simplified: Update cook time as remainder? 
                                // Actually, better to expose prep/cook separate?
                                // For V1, let's just accept this is Total Time display but we edit fields separately if we want?
                                // Let's disable editing total here, creating confusion.
                                // Or show inputs for Prep / Cook separately.
                            }} 
                            disabled
                        />
                        <span>min Total</span>
                    </div>
                </div>

                {/* Servings */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border shadow-sm">
                    <Users size={16} className="text-emerald-500" /> 
                    <Input 
                        type="number"
                        className="w-10 h-6 p-0 text-center border-none bg-transparent"
                        value={formData.servings}
                        onChange={(e) => setFormData({...formData, servings: Number(e.target.value)})}
                    />
                    <span>Servings</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 justify-center">
                    {formData.dietaryTags.map((tag, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100 shadow-sm">
                            <ChefHat size={14} />
                            <span>{tag}</span>
                            {/* Deletion logic could go here */}
                        </div> 
                    ))}
                </div>
            </div>
        </CardHeader>

        <CardContent className="p-0">
            <div className="grid md:grid-cols-5 divide-y md:divide-y-0 md:divide-x min-h-[500px]">
                
                {/* Ingredients Column */}
                <div className="md:col-span-2 p-6 bg-slate-50/50 flex flex-col">
                    <h3 className="font-semibold text-lg mb-4 text-emerald-900 flex items-center gap-2">
                        Ingredients
                    </h3>
                    <Textarea 
                        value={formData.ingredients}
                        onChange={(e) => setFormData({...formData, ingredients: e.target.value})}
                        className="flex-1 min-h-[400px] font-sans text-base leading-relaxed bg-white border-slate-200"
                        placeholder="List ingredients here..."
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">One ingredient per line</p>
                </div>

                {/* Instructions Column */}
                <div className="md:col-span-3 p-6 bg-white flex flex-col">
                    <h3 className="font-semibold text-lg mb-4 text-emerald-900 flex items-center gap-2">
                        Instructions
                    </h3>
                    <Textarea 
                         value={formData.instructions}
                         onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                         className="flex-1 min-h-[400px] font-sans text-base leading-relaxed border-slate-200"
                         placeholder="List instructions here..."
                    />
                     <p className="text-xs text-muted-foreground mt-2 text-center">One step per line</p>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t px-4">
        <div className="flex gap-2">
             <Button variant="ghost" onClick={handleStartOver} className="text-muted-foreground hover:text-destructive">
                Discard & New
             </Button>
        </div>
        
        <div className="flex gap-3">
             <Button variant="outline" onClick={() => window.print()}>
                <Printer size={16} className="mr-2"/> Print
             </Button>
             
             <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="min-w-[140px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200"
             >
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4"/> Save Changes</>}
             </Button>
        </div>
      </div>
    </div>
  );
}
