"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useWizard } from "@/context/wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { Plus } from "lucide-react";

const schema = z.object({
  ingredients: z.string().min(10, "Please list at least a few ingredients"),
  restrictions: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const COMMON_RESTRICTIONS = ["Gluten-free", "Keto", "Vegan", "Dairy-free", "Nut-free"];

export default function IngredientsPage() {
  const router = useRouter();
  const { data, updateData } = useWizard();
  
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

  const onSubmit = (formData: FormData) => {
    updateData(formData);
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
      // Optional: trigger validation if needed, but not strictly required for optional field
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-semibold tracking-tight">What&apos;s in your pantry?</h2>
        <p className="text-muted-foreground mt-1">
          Tell us what ingredients you have to work with.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-3">
          <label htmlFor="ingredients" className="text-sm font-medium leading-none">
            Ingredients <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <textarea
                id="ingredients"
                {...register("ingredients")}
                onBlur={handleBlur}
                className="flex min-h-[160px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
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
            placeholder="e.g. Gluten-free, Keto, Vegan..."
          />
          <div className="flex flex-wrap gap-2 pt-2">
            {COMMON_RESTRICTIONS.map((res) => (
                <Badge 
                    key={res} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors pr-1.5"
                    onClick={() => addRestriction(res)}
                >
                    {res} <Plus size={12} className="ml-1" />
                </Badge>
            ))}
          </div>
          {errors.restrictions && (
            <p className="text-sm font-medium text-destructive">{errors.restrictions.message}</p>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button type="submit" size="lg" className="w-full sm:w-auto text-base px-8 h-12 rounded-xl">
            Next Step: Upload Photo
          </Button>
        </div>
      </form>
    </div>
  );
}
