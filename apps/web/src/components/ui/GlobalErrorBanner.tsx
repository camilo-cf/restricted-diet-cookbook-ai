"use client";
import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { clsx } from "clsx";

export function GlobalErrorBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-md flex items-center justify-center gap-2">
      <AlertCircle className="w-5 h-5" />
      <span className="font-medium">No internet connection.</span>
      <button 
        onClick={() => window.location.reload()}
        className="ml-4 flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
      >
        <RefreshCw className="w-3 h-3" /> Retry
      </button>
    </div>
  );
}
