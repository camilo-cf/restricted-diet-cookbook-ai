"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, Printer, Share2, ChefHat, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RecipeDetail() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
       if (!id) return;
       try {
           const { data, error } = await api.GET("/recipes/{id}", {
               params: { path: { id: id as string } }
           });
           if (error) throw error;
           setRecipe(data);
       } catch (err) {
           console.error(err);
           setError(true);
       } finally {
           setLoading(false);
       }
    }
    fetchRecipe();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20">Loading...</div>;
  if (error || !recipe) return (
      <div className="text-center py-20">
          <h2 className="text-xl font-bold mb-4">Recipe Not Found</h2>
          <Link href="/recipes" className="text-primary hover:underline">Back to Explorer</Link>
      </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      <Link href="/recipes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft size={16} className="mr-1"/> Back to Recipes
      </Link>

      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">{recipe.title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{recipe.description}</p>
        
        <div className="flex justify-center gap-2 pt-2">
            {(recipe.dietaryTags || []).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-sm px-3 py-1 bg-amber-50 text-amber-800 border-amber-100">
                    {tag}
                </Badge>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
              <Clock className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Prep Time</div>
              <div className="font-bold text-lg">{recipe.prepTimeMinutes || 0}m</div>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
              <Clock className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Cook Time</div>
              <div className="font-bold text-lg">{recipe.cookTimeMinutes || 0}m</div>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
              <Users className="w-6 h-6 mx-auto text-blue-500 mb-2" />
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Servings</div>
              <div className="font-bold text-lg">2</div> {/* Placeholder if not in DB */}
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
              <ChefHat className="w-6 h-6 mx-auto text-purple-500 mb-2" />
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Difficulty</div>
              <div className="font-bold text-lg">Medium</div> {/* Placeholder */}
          </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-1 space-y-6">
              <Card className="bg-slate-50/50 border-none shadow-inner">
                  <CardContent className="p-6">
                      <h3 className="font-bold text-xl mb-6 flex items-center gap-2">Ingredients</h3>
                      <ul className="space-y-3">
                          {(recipe.ingredients || []).map((ing: string, i: number) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                  <span>{ing}</span>
                              </li>
                          ))}
                      </ul>
                  </CardContent>
              </Card>
          </div>

          {/* Instructions */}
          <div className="md:col-span-2">
               <h3 className="font-bold text-xl mb-6">Instructions</h3>
               <div className="space-y-6">
                   {(recipe.instructions || []).map((step: string, i: number) => (
                       <div key={i} className="flex gap-4 group">
                           <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                               {i + 1}
                           </div>
                           <p className="text-gray-600 leading-relaxed pt-1 text-base">
                               {step}
                           </p>
                       </div>
                   ))}
               </div>
          </div>
      </div>
      
      <div className="flex justify-center gap-4 mt-16 pt-8 border-t">
            <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print Recipe
            </Button>
            <Button variant="outline">
                <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
      </div>

    </div>
  );
}
