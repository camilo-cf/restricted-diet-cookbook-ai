"use client";

import { useWizard } from "@/context/wizard-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle, Clock, Users, Printer, Share2, ChefHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ResultPage() {
  const router = useRouter();
  const { data, reset } = useWizard();

  useEffect(() => {
    // If no data, redirect to start
    if (!data.ingredients && !data.generatedRecipe) {
      router.push("/wizard/ingredients");
    }
  }, [data, router]);

  const handleStartOver = () => {
    reset();
    router.push("/wizard/ingredients");
  };

  // Mock recipe if none exists (for testing flow without actual API yet)
  const recipe = data.generatedRecipe || {
    id: "mock-id",
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
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <Badge variant="secondary" className="mb-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            <CheckCircle size={14} className="mr-1" /> Generated Successfully
        </Badge>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">{recipe.title}</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">{recipe.description}</p>
      </div>

      <Card className="border shadow-lg overflow-hidden bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-muted/30 border-b pb-6">
            <div className="flex justify-center gap-8 text-sm font-medium text-gray-600">
                <div className="flex items-center gap-2">
                    <Clock size={18} className="text-primary" /> 
                    <span>{(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} min Total</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-primary" /> 
                    <span>2 Servings</span>
                </div>
                {/* Dynamically show tags */}
                {recipe.dietaryTags?.map(tag => (
                   <div key={tag} className="flex items-center gap-2">
                        <ChefHat size={18} className="text-accent" />
                        <span>{tag}</span>
                   </div> 
                ))}
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="grid md:grid-cols-5 divide-y md:divide-y-0 md:divide-x h-full">
                {/* Ingredients Column */}
                <div className="md:col-span-2 p-6 md:p-8 bg-orange-50/30">
                    <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 text-foreground">
                        Ingredients
                    </h3>
                    <ul className="space-y-3">
                        {recipe.ingredients.map((ing, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                                <span>{ing}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Instructions Column */}
                <div className="md:col-span-3 p-6 md:p-8 bg-white">
                    <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 text-foreground">
                        Instructions
                    </h3>
                    <ol className="space-y-6">
                        {recipe.instructions.map((step, i) => (
                            <li key={i} className="flex gap-4">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold border border-primary/20">
                                    {i + 1}
                                </span>
                                <p className="text-gray-700 text-sm leading-relaxed pt-1">{step}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer size={16} /> Print Recipe
        </Button>
        <Button variant="outline" className="gap-2">
            <Share2 size={16} /> Share
        </Button>
        <Button onClick={handleStartOver} size="lg" className="sm:ml-4 shadow-lg shadow-primary/20">
          Create Another Recipe
        </Button>
      </div>
    </div>
  );
}
