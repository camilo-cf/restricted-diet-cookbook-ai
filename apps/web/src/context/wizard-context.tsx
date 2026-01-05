"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { components } from "@cookbook/api-client";   
type Recipe = components["schemas"]["Recipe"];

interface WizardData {
  ingredients: string;
  restrictions: string;
  photoKey?: string; // S3 Object Key (display only)
  uploadId?: string; // Backend Database ID
  photoPreview?: string; // Full browser-accessible URL
  generatedRecipe?: Recipe;
}

interface WizardContextType {
  data: WizardData;
  updateData: (partial: Partial<WizardData>) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

const STORAGE_KEY = "cookbook_wizard_data";

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<WizardData>({
    ingredients: "",
    restrictions: "",
  });
  const [loaded, setLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse wizard data", e);
      }
    }
    setLoaded(true);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, loaded]);

  const updateData = (partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const reset = () => {
    setData({ ingredients: "", restrictions: "" });
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <WizardContext.Provider value={{ data, updateData, reset }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
