"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, Printer, Share2, ChefHat, ArrowLeft, Edit3, Trash2 } from "lucide-react";
import Link from "next/link";
import { useWizard } from "@/context/wizard-context";
import { useToast } from "@/components/ui/Toast";

export default function RecipeDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { updateData } = useWizard();
  const { toast } = useToast();
  const [recipe, setRecipe] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
       if (!id) return;
       try {
           // Parallel fetch for speed
           const [recipeRes, userRes] = await Promise.all([
               api.GET("/recipes/{id}", { params: { path: { id: id as string } } }),
               api.GET("/auth/me")
           ]);

           if (recipeRes.data) {
               setRecipe(recipeRes.data);
           } else {
               throw new Error("Recipe not found");
           }
           
           if (userRes && "data" in userRes && userRes.data) {
               setCurrentUser(userRes.data);
           }
       } catch (err) {
           console.error(err);
           setError(true);
       } finally {
           setLoading(false);
       }
    }
    fetchData();
  }, [id]);

  const canEdit = currentUser && recipe && (
    currentUser.id === recipe.userId || 
    currentUser.role === "admin" || 
    currentUser.role === "maintainer" ||
    currentUser.email === "demo@example.com"
  );

  const handleEdit = () => {
    if (!recipe) return;
    // Load data into wizard context
    updateData({
        ingredients: (recipe.ingredients || []).join("\n"),
        restrictions: (recipe.dietaryTags || []).join(", "),
        generatedRecipe: {
            id: recipe.id,
            title: recipe.title,
            description: recipe.description || "",
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
            dietaryTags: recipe.dietaryTags || [],
            prepTimeMinutes: recipe.prepTimeMinutes,
            cookTimeMinutes: recipe.cookTimeMinutes,
            created_at: recipe.created_at,
            imageUrl: recipe.imageUrl,
            userId: recipe.userId
        },
        photoPreview: recipe.imageUrl
    });
    // Redirect to wizard result page for editing
    router.push("/wizard/result");
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("Are you sure you want to delete this recipe? This action cannot be undone.")) return;
    
    try {
        const { error } = await api.DELETE("/recipes/{id}", {
            params: { path: { id: id as string } }
        });
        if (error) throw error;
        toast("Recipe deleted successfully", "success");
        router.push("/recipes");
    } catch (err) {
        console.error(err);
        toast("Failed to delete recipe", "error");
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-emerald-600 animate-pulse font-medium">Loading recipe details...</div>;
  if (error || !recipe) return (
      <div className="text-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Recipe Not Found</h2>
          <p className="text-muted-foreground mb-8">It might have been removed or the link is incorrect.</p>
          <Link href="/recipes" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline flex items-center justify-center gap-2">
              <ArrowLeft size={18}/> Back to Explorer
          </Link>
      </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <Link href="/recipes" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 group transition-colors">
            <ArrowLeft size={18} className="mr-2 transition-transform group-hover:-translate-x-1"/> Back to Recipes
        </Link>
        
        {canEdit && (
            <div className="flex gap-2">
                <Button onClick={handleEdit} className="bg-amber-500 hover:bg-amber-600 shadow-md hover:shadow-lg transition-all gap-2">
                    <Edit3 size={18} /> Edit
                </Button>
                <Button onClick={handleDelete} variant="destructive" className="shadow-md hover:shadow-lg transition-all gap-2">
                    <Trash2 size={18} /> Delete
                </Button>
            </div>
        )}
      </div>

      <div className="text-center space-y-4 mb-10">
        {recipe.imageUrl && (
            <div className="w-full h-64 md:h-96 relative mb-8 rounded-2xl overflow-hidden shadow-xl border border-gray-100 mx-auto max-w-2xl bg-gray-50 flex items-center justify-center">
                <img 
                    src={recipe.imageUrl} 
                    alt={recipe.title} 
                    className="max-w-full max-h-full object-contain transition-transform hover:scale-105 duration-700"
                />
            </div>
        )}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">{recipe.title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{recipe.description}</p>
        
        <div className="flex justify-center gap-2 pt-2 flex-wrap">
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
              <div className="font-bold text-lg">2</div>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
              <ChefHat className="w-6 h-6 mx-auto text-purple-500 mb-2" />
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Difficulty</div>
              <div className="font-bold text-lg">Medium</div>
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
