"use client";

import { WizardProvider } from "@/context/wizard-context";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Check, ChefHat, Camera, Sparkles } from "lucide-react";

const STEPS = [
  { label: "Ingredients", href: "/wizard/ingredients", icon: ChefHat },
  { label: "Upload Photo", href: "/wizard/upload", icon: Camera },
  { label: "Review", href: "/wizard/review", icon: Sparkles },
];

function WizardProgress() {
  const pathname = usePathname();

  return (
    <div className="mb-12 relative">
      <div className="absolute top-5 left-0 w-full h-0.5 bg-secondary -z-10" />
      
      <div className="flex justify-between items-start">
        {STEPS.map((step, index) => {
          const isActive = pathname.startsWith(step.href);
          // Simple logic: if we are on a later step, this one is completed
          // In a real app, query wizard context, but this approximation works for UI demo
          const activeIndex = STEPS.findIndex(s => pathname.startsWith(s.href));
          const isCompleted = index < activeIndex;
          
          return (
            <div key={step.href} className="flex flex-col items-center flex-1">
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-background",
                  isActive ? "border-primary text-primary shadow-[0_0_0_4px_rgba(16,185,129,0.1)] scale-110" : 
                  isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? <Check size={16} /> : <step.icon size={18} />}
              </div>
              <span 
                className={clsx(
                    "text-xs font-medium mt-3 transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Create Your Recipe
          </h1>
          <p className="text-muted-foreground mt-2">
              Follow the steps to generate your personalized meal
          </p>
        </div>
        
        <WizardProgress />
        
        <div className="bg-card text-card-foreground p-6 md:p-8 rounded-2xl shadow-xl shadow-primary/5 border animate-in slide-up">
          {children}
        </div>
      </div>
    </div>
  );
}
