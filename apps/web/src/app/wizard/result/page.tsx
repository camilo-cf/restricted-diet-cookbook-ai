"use client";

import { useWizard } from "@/context/wizard-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle, Clock, Users } from "lucide-react";

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
    title: "Mock AI Recipe",
    description: "A delicious meal generated just for you based on your ingredients.",
    prepTimeMinutes: 20,
    cookTimeMinutes: 15,
    ingredients: [
      "1 cup Ingredient 1",
      "200g Ingredient 2"
    ],
    instructions: [
      "Mix ingredients together.",
      "Cook for 20 minutes.",
      "Serve hot."
    ],
    dietaryTags: [],
    created_at: new Date().toISOString()
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-3xl font-bold mb-2 text-gray-900">{recipe.title}</h2>
        <p className="text-muted-foreground">{recipe.description}</p>
      </div>

      <div className="flex justify-center gap-6 text-sm text-gray-600">
        <div className="flex items-center">
            <Clock size={16} className="mr-2" /> {recipe.prepTimeMinutes || "?"}m Prep
        </div>
        <div className="flex items-center">
             {/* Servings not in schema yet, omitting or hardcoding */}
            <Users size={16} className="mr-2" /> 2 Servings
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
            <h3 className="font-semibold text-lg mb-4 text-orange-900">Ingredients</h3>
            <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex justify-between text-sm text-gray-800 border-b border-orange-200/50 pb-2 last:border-0">
                        <span>{ing}</span>
                    </li>
                ))}
            </ul>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
             <h3 className="font-semibold text-lg mb-4 text-gray-900">Instructions</h3>
             <ol className="space-y-4">
                {recipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">
                            {i + 1}
                        </span>
                        <p className="text-gray-700 text-sm leading-relaxed">{step}</p>
                    </li>
                ))}
             </ol>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <Button variant="outline" onClick={handleStartOver} size="lg">
          Start Over
        </Button>
      </div>
    </div>
  );
}
