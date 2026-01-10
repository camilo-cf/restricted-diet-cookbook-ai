"use client";

import { useState, useEffect, Suspense } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Search, Clock, Users, ChefHat } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { clsx } from "clsx";

const DIETARY_OPTIONS = ["Vegan", "Keto", "Gluten-free", "Dairy-free", "Nut-free", "Low-carb", "Sugar-free"];

function RecipeExplorerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const initialTags = searchParams.get("dietary_tags")?.split(",") || [];
  
  const [query, setQuery] = useState(initialQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag) 
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    
    // Update URL
    const params = new URLSearchParams(searchParams as any);
    if (newTags.length > 0) {
        params.set("dietary_tags", newTags.join(","));
    } else {
        params.delete("dietary_tags");
    }
    router.push(`/recipes?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams as any);
    if (query) params.set("q", query);
    else params.delete("q");
    router.push(`/recipes?${params.toString()}`);
  };

  useEffect(() => {
    async function fetchRecipes() {
      setLoading(true);
      try {
        const q = searchParams.get("q") || undefined;
        const dietary_tags = searchParams.get("dietary_tags") || undefined;
        const { data, error } = await api.GET("/recipes", {
          params: { query: { q, limit: 20, dietary_tags } as any }
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
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8">
      <div className="text-center space-y-6">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 font-brand">Community Recipes</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Discover recipes created by our AI and refined by humans, filtered for your specific needs.</p>
        
        <div className="max-w-2xl mx-auto space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-500 group-focus-within:text-emerald-600 transition-colors" />
                    <Input 
                        placeholder="Search by ingredients, title or tags..." 
                        value={query} 
                        onChange={e => setQuery(e.target.value)}
                        className="pl-9 h-12 rounded-2xl border-emerald-100 bg-white shadow-sm focus:ring-emerald-500 transition-all hover:border-emerald-200"
                    />
                </div>
                <Button type="submit" className="h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 font-bold transition-all hover:scale-105 active:scale-95">Search</Button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {DIETARY_OPTIONS.map(tag => (
                    <Badge 
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "secondary"}
                        className={clsx(
                            "cursor-pointer px-4 py-1.5 rounded-full text-sm font-medium transition-all select-none border-transparent",
                            selectedTags.includes(tag) 
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-100 hover:bg-emerald-700" 
                                : "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border-slate-100 shadow-sm"
                        )}
                        onClick={() => toggleTag(tag)}
                    >
                        {tag}
                    </Badge>
                ))}
                {selectedTags.length > 0 && (
                    <button 
                        onClick={() => { setSelectedTags([]); router.push("/recipes"); setQuery(""); }}
                        className="text-xs text-slate-400 hover:text-red-500 ml-2 font-medium underline underline-offset-4"
                    >
                        Clear all
                    </button>
                )}
            </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4 text-slate-400">
            <div className="animate-spin text-emerald-600">
                <ChefHat size={40} />
            </div>
            <p className="font-medium animate-pulse">Finding the best recipes for you...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {recipes.map((recipe) => (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block group">
                    <Card className="h-full overflow-hidden hover:shadow-2xl transition-all duration-500 border-slate-100 bg-white/80 group transform hover:-translate-y-1 rounded-3xl">
                        <div className="h-48 md:h-56 overflow-hidden bg-slate-50 flex items-center justify-center relative border-b border-slate-100/50">
                             {recipe.imageUrl ? (
                                <img 
                                    src={recipe.imageUrl} 
                                    alt={recipe.title} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                             ) : (
                                <div className="w-full h-full bg-gradient-to-br from-emerald-50/50 to-teal-50/50 flex items-center justify-center">
                                    <ChefHat size={56} className="text-emerald-200 group-hover:text-emerald-300 transition-colors" />
                                </div>
                             )}
                             <div className="absolute top-4 left-4 flex gap-1 flex-wrap max-w-[80%]">
                                {(recipe.dietaryTags || []).slice(0, 2).map((tag: string) => (
                                    <Badge key={tag} className="bg-white/90 backdrop-blur-md text-emerald-800 text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 rounded-lg border-emerald-100 shadow-sm">
                                        {tag}
                                    </Badge>
                                ))}
                             </div>
                        </div>
                        <CardHeader className="pb-2 space-y-3">
                             <CardTitle className="text-xl leading-tight group-hover:text-emerald-700 transition-colors font-brand text-slate-900">
                                {recipe.title || "Untitled Recipe"}
                             </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-600 space-y-4">
                             <div className="flex items-center gap-4 text-slate-400 font-medium">
                                <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                                    <Clock size={16} className="text-emerald-500" /> 
                                    {(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)}m
                                </span>
                                <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                                    <Users size={16} className="text-emerald-500" /> 
                                    {recipe.servings || "2-4"} servings
                                </span>
                             </div>
                             <p className="line-clamp-2 text-slate-500 leading-relaxed italic">
                                &quot;{recipe.description || "No description provided."}&quot;
                             </p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
            
            {!loading && recipes.length === 0 && (
                <div className="col-span-full text-center py-20 text-slate-400 bg-white rounded-[2rem] border-2 border-dashed border-slate-100 shadow-inner">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={32} className="text-slate-300" />
                    </div>
                    <p className="text-lg font-semibold text-slate-600">No recipes found matching your criteria.</p>
                    <p className="mt-1">Try adjusting your search or filters.</p>
                    <br/>
                    <Link href="/wizard">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-10">Create One Now</Button>
                    </Link>
                </div>
            )}
        </div>
      )}
    </div>
  );
}

export default function RecipeExplorer() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-muted-foreground">Loading...</div>}>
      <RecipeExplorerContent />
    </Suspense>
  );
}
