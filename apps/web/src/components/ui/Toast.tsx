"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { CheckCircle, AlertCircle, X, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full outline-none">
        {toasts.map((t) => (
          <div 
            key={t.id}
            className={`
                flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-right-full duration-300
                ${t.type === "success" ? "bg-emerald-50/90 border-emerald-200 text-emerald-900" : 
                  t.type === "error" ? "bg-red-50/90 border-red-200 text-red-900" : 
                  "bg-slate-800/90 border-slate-700 text-white"}
            `}
          >
            {t.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-600" />}
            {t.type === "error" && <AlertCircle className="w-5 h-5 text-red-600" />}
            {t.type === "info" && <Info className="w-5 h-5 text-blue-400" />}
            
            <p className="text-sm font-medium flex-1">{t.message}</p>
            
            <button onClick={() => removeToast(t.id)} className="hover:opacity-70 transition-opacity p-0.5">
                <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
