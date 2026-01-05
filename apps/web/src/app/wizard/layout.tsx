"use client";

import { WizardProvider } from "@/context/wizard-context";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";

const STEPS = [
  { label: "Ingredients", href: "/wizard/ingredients" },
  { label: "Upload Photo", href: "/wizard/upload" },
  { label: "Review", href: "/wizard/review" },
];

function WizardProgress() {
  const pathname = usePathname();

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        {STEPS.map((step, index) => {
          const isActive = pathname.startsWith(step.href);
          const isCompleted = false; // logic could be improved if we track step completion
          
          return (
            <div key={step.href} className="flex-1 text-center">
              <div
                className={clsx(
                  "text-sm font-medium transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                Step {index + 1}
              </div>
              <div
                className={clsx(
                  "h-2 mt-2 rounded-full mx-2 transition-all duration-300",
                  isActive ? "bg-blue-600" : "bg-gray-200"
                )}
              />
              <span className="text-xs text-gray-500 mt-1 block">{step.label}</span>
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
    <WizardProvider>
      <div className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Create Your Recipe
        </h1>
        <WizardProgress />
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          {children}
        </div>
      </div>
    </WizardProvider>
  );
}
