"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Search, Clock, Users, ChefHat } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

export default function RecipeExplorer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/recipes?q=${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    async function fetchRecipes() {
      setLoading(true);
      try {
        const q = searchParams.get("q") || undefined;
        const { data, error } = await api.GET("/recipes", {
          params: { query: { q, limit: 20 } }
        });
        if (data && data.data) {
          setRecipes(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecipes();
  }, [searchParams]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Community Recipes</h1>
        <p className="text-muted-foreground">Discover recipes created by our AI and refined by humans.</p>
        
        <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-3">
            <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-500 group-focus-within:text-emerald-600 transition-colors" />
                <Input 
                    placeholder="Search by keyword..." 
                    value={query} 
                    onChange={e => setQuery(e.target.value)}
                    className="pl-9 h-11 rounded-xl border-emerald-100 bg-white/50 backdrop-blur-sm focus:ring-emerald-500"
                />
            </div>
            <Button type="submit" className="h-11 px-6 rounded-xl hover:scale-105 transition-transform">Search</Button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block group">
                    <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200 group">
                        <div className="h-48 overflow-hidden bg-gray-100 flex items-center justify-center relative">
                             {recipe.imageUrl ? (
                                <img 
                                    src={recipe.imageUrl} 
                                    alt={recipe.title} 
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                />
                             ) : (
                                <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
                                    <ChefHat size={48} className="text-emerald-200 group-hover:text-emerald-300 transition-colors" />
                                </div>
                             )}
                        </div>
                        <CardHeader className="pb-2">
                             <div className="flex gap-2 mb-2 flex-wrap">
                                {(recipe.dietaryTags || []).slice(0, 3).map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-xs font-normal">
                                        {tag}
                                    </Badge>
                                ))}
                             </div>
                             <CardTitle className="text-lg leading-tight group-hover:text-emerald-700 transition-colors">
                                {recipe.title || "Untitled Recipe"}
                             </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-gray-500">
                             <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-1">
                                    <Clock size={14} /> 
                                    {(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)}m
                                </span>
                                {/* Add more metadata if available */}
                             </div>
                             <p className="mt-3 line-clamp-2 text-muted-foreground">
                                {recipe.description}
                             </p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
            
            {!loading && recipes.length === 0 && (
                <div className="col-span-full text-center py-20 text-muted-foreground bg-gray-50 rounded-xl border border-dashed">
                    No recipes found. Be the first to create one!
                    <br/>
                    <Link href="/wizard" className="text-primary hover:underline mt-2 inline-block">Create Recipe</Link>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
