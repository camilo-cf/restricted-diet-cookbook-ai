"use client";

import { useRouter } from "next/navigation";
import { useWizard } from "@/context/wizard-context";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sparkles, Edit2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

export default function ReviewPage() {
  const router = useRouter();
  const { data, updateData } = useWizard();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
        const { data: recipe, error } = await api.POST("/ai/recipe", {
            body: {
                ingredients: data.ingredients ? data.ingredients.split(",").map(i => i.trim()) : [],
                restrictions: data.restrictions ? data.restrictions.split(",").map(r => r.trim()) : [],
                uploadId: data.uploadId,
                user_notes: ""
            }
        });

        if (error || !recipe) {
            console.error("Generation failed", error);
            toast("Failed to generate recipe. Please try again.", "error");
            setIsGenerating(false);
            return;
        }

        updateData({ generatedRecipe: recipe });
        router.push("/wizard/result");

    } catch (e) {
        console.error(e);
        toast("An unexpected error occurred.", "error");
        setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Ready to cook?</h2>
        <p className="text-muted-foreground">
          Review your details before our AI Chef gets to work.
        </p>
      </div>

      <div className="space-y-4">
        {/* Ingredients Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">Ingredients</h3>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600" onClick={() => router.push("/wizard/ingredients")}>
                    <Edit2 size={12} className="mr-1"/> Edit
                </Button>
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{data.ingredients || "No ingredients listed."}</p>
        </div>

        {/* Restrictions Section */}
        {data.restrictions && (
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">Dietary Restrictions</h3>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600" onClick={() => router.push("/wizard/ingredients")}>
                        <Edit2 size={12} className="mr-1"/> Edit
                    </Button>
                </div>
                <p className="text-sm text-gray-600">{data.restrictions}</p>
            </div>
        )}

        {/* Photo Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
             <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">Photo Analysis</h3>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600" onClick={() => router.push("/wizard/upload")}>
                    <Edit2 size={12} className="mr-1"/> Edit
                </Button>
            </div>
            <p className="text-sm text-gray-600">
                {data.photoKey ? "Photo uploaded and ready for analysis." : "No photo uploaded."}
            </p>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => router.back()} disabled={isGenerating}>
          Back
        </Button>
        <Button 
            onClick={handleGenerate} 
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02]"
            disabled={isGenerating}
        >
            {isGenerating ? (
                <>
                 <Sparkles className="w-4 h-4 mr-2 animate-spin" /> Cooking...
                </>
            ) : (
                <>
                <Sparkles className="w-4 h-4 mr-2" /> Generate Recipe
                </>
            )}
        </Button>
      </div>
    </div>
  );
}
