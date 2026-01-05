

"use client";

import { useWizard } from "@/context/wizard-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, Users, Save, Printer, Share2, ChefHat, Loader2 } from "lucide-react";
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

  useEffect(() => {
    // If no data and no mock intended, redirect? 
    // Commented out to allow seeing mock in dev
    // if (!data.generatedRecipe) router.push("/wizard/ingredients");
  }, [data, router]);

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
                  dietaryTags: formData.dietaryTags
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
