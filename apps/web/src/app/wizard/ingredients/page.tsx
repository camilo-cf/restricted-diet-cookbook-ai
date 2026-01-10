"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useWizard } from "@/context/wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Plus, AlertTriangle, CheckCircle2, RotateCcw, ArrowRight, Loader2 } from "lucide-react";

const schema = z.object({
  ingredients: z.string().min(10, "Please list at least a few ingredients"),
  restrictions: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ValidationIssue {
    ingredient: string;
    issue: string;
    suggestion: string;
}

const COMMON_RESTRICTIONS = ["Gluten-free", "Keto", "Vegan", "Dairy-free", "Nut-free"];

export default function IngredientsPage() {
  const router = useRouter();
  const { data, updateData } = useWizard();
  const [isValidating, setIsValidating] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ingredients: data.ingredients,
      restrictions: data.restrictions,
    },
  });

  const currentRestrictions = watch("restrictions") || "";

  // Sync from context if context loads later or has data
  useEffect(() => {
    setValue("ingredients", data.ingredients);
    setValue("restrictions", data.restrictions || "");
  }, [data, setValue]);

  const validateAndProceed = async (formData: FormData) => {
    if (!formData.restrictions || formData.restrictions.trim() === "") {
        updateData(formData);
        router.push("/wizard/upload");
        return;
    }

    setIsValidating(true);
    try {
        const ingredientsList = formData.ingredients.split(",").map(i => i.trim());
        const restrictionsList = formData.restrictions.split(",").map(r => r.trim());
        
        const { data: resData, error } = await (api.POST as any)("/ai/validate", {
            body: {
                ingredients: ingredientsList,
                restrictions: restrictionsList
            }
        });

        if (!error && resData.issues && resData.issues.length > 0) {
            setValidationIssues(resData.issues);
            setShowSuggestions(true);
        } else {
            updateData(formData);
            router.push("/wizard/upload");
        }
    } catch (err) {
        // Fallback: just proceed if AI fails
        updateData(formData);
        router.push("/wizard/upload");
    } finally {
        setIsValidating(false);
    }
  };

  const applySuggestions = () => {
    let text = getValues("ingredients");
    validationIssues.forEach(issue => {
        // Simple case-insensitive replacement
        const regex = new RegExp(issue.ingredient, "gi");
        text = text.replace(regex, issue.suggestion);
    });
    setValue("ingredients", text);
    updateData({ ...getValues(), ingredients: text });
    setShowSuggestions(false);
    setValidationIssues([]);
    // After fixing, we can proceed
    router.push("/wizard/upload");
  };

  const handleBlur = () => {
    updateData(getValues());
  };

  const addRestriction = (res: string) => {
    const current = getValues("restrictions") || "";
    if (!current.includes(res)) {
      const newValue = current ? `${current}, ${res}` : res;
      setValue("restrictions", newValue);
    }
  };

  if (showSuggestions) {
      return (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-amber-900">Wait, something&apos;s not right!</h3>
                        <p className="text-amber-700 text-sm">We found some ingredients that don&apos;t match your dietary restrictions.</p>
                    </div>
                </div>

                <div className="space-y-3 mt-4">
                    {validationIssues.map((issue, i) => (
                        <div key={i} className="bg-white/80 rounded-xl p-4 border border-amber-100 shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-900">{issue.ingredient}</span>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                                    {issue.issue}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-600 flex items-center gap-2">
                                <ArrowRight size={14} className="text-amber-500" />
                                <span>Suggested: <strong className="text-emerald-700">{issue.suggestion}</strong></span>
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <Button 
                    variant="outline" 
                    size="lg" 
                    className="h-14 rounded-2xl font-bold order-2 sm:order-1"
                    onClick={() => setShowSuggestions(false)}
                >
                    <RotateCcw size={18} className="mr-2" /> No, let me edit
                </Button>
                <Button 
                    size="lg" 
                    className="h-14 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 order-1 sm:order-2"
                    onClick={applySuggestions}
                >
                    <CheckCircle2 size={18} className="mr-2" /> Apply all suggestions
                </Button>
            </div>
            <p className="text-center">
                <button 
                    className="text-sm text-slate-400 hover:text-slate-600 underline"
                    onClick={() => router.push("/wizard/upload")}
                >
                    Ignore and proceed anyway
                </button>
            </p>
          </div>
      );
  }

  return (
    <div className="space-y-8">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-semibold tracking-tight">What&apos;s in your pantry?</h2>
        <p className="text-muted-foreground mt-1">
          Tell us what ingredients you have to work with.
        </p>
      </div>

      <form onSubmit={handleSubmit(validateAndProceed)} className="space-y-8">
        <div className="space-y-3">
          <label htmlFor="ingredients" className="text-sm font-medium leading-none">
            Ingredients <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <textarea
                id="ingredients"
                {...register("ingredients")}
                onBlur={handleBlur}
                className="flex min-h-[160px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y transition-all hover:border-emerald-200 focus:border-emerald-500"
                placeholder="e.g. 2 eggs, milk, flour, spinach, half a onion..."
            />
          </div>
          {errors.ingredients && (
            <p className="text-sm font-medium text-destructive">{errors.ingredients.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
             Tip: Be as specific as you can with quantities for better results.
          </p>
        </div>

        <div className="space-y-3">
          <label htmlFor="restrictions" className="text-sm font-medium leading-none">
            Dietary Restrictions (Optional)
          </label>
          <Input
            id="restrictions"
            {...register("restrictions")}
            onBlur={handleBlur}
            className="rounded-xl h-12 transition-all hover:border-emerald-200 focus:border-emerald-500"
            placeholder="e.g. Gluten-free, Keto, Vegan..."
          />
          <div className="flex flex-wrap gap-2 pt-2">
            {COMMON_RESTRICTIONS.map((res) => (
                <Badge 
                    key={res} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-emerald-100 hover:text-emerald-700 transition-all pr-1.5 py-1.5 rounded-lg border-transparent flex items-center gap-1"
                    onClick={() => addRestriction(res)}
                >
                    {res} <Plus size={12} className="opacity-60" />
                </Badge>
            ))}
          </div>
          {errors.restrictions && (
            <p className="text-sm font-medium text-destructive">{errors.restrictions.message}</p>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button 
            type="submit" 
            size="lg" 
            disabled={isValidating}
            className="w-full sm:w-auto text-base px-10 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
          >
            {isValidating ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Checking ingredients...
                </>
            ) : (
                "Next Step: Upload Photo"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
