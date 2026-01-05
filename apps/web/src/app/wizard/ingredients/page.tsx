"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useWizard } from "@/context/wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // We might need a generic Textarea component too, or just use Input for now? A textarea is better for ingredients.
// I'll assume standard HTML textarea with tailwind classes for now to avoid dependency on missing generic Textarea component.
import { useEffect } from "react";

const schema = z.object({
  ingredients: z.string().min(10, "Please list at least a few ingredients"),
  restrictions: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function IngredientsPage() {
  const router = useRouter();
  const { data, updateData } = useWizard();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ingredients: data.ingredients,
      restrictions: data.restrictions,
    },
  });

  // Sync from context if context loads later or has data
  useEffect(() => {
    setValue("ingredients", data.ingredients);
    setValue("restrictions", data.restrictions || "");
  }, [data, setValue]);

  const onSubmit = (formData: FormData) => {
    updateData(formData);
    router.push("/wizard/upload");
  };

  // Autosave on blur or periodically? Blur is efficient.
  const handleBlur = () => {
    updateData(getValues());
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">What do you have?</h2>
        <p className="text-muted-foreground text-sm">
          List your available ingredients. Be as specific as you like!
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="ingredients" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Ingredients <span className="text-red-500">*</span>
          </label>
          <textarea
            id="ingredients"
            {...register("ingredients")}
            onBlur={handleBlur}
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. 2 eggs, milk, flour, spinach, half a onion..."
          />
          {errors.ingredients && (
            <p className="text-sm font-medium text-destructive">{errors.ingredients.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="restrictions" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Dietary Restrictions (Optional)
          </label>
          <Input
            id="restrictions"
            {...register("restrictions")}
            onBlur={handleBlur}
            placeholder="e.g. Gluten-free, Keto, Vegan..."
          />
          {errors.restrictions && (
            <p className="text-sm font-medium text-destructive">{errors.restrictions.message}</p>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Next Step: Upload Photo
          </Button>
        </div>
      </form>
    </div>
  );
}
