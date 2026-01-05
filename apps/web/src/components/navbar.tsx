"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Search, PlusCircle, UserCircle, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => pathname === path;
  const linkClass = (path: string) => `
    flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
    ${isActive(path) ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
  `;

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
               <div className="bg-emerald-600 text-white p-2 rounded-xl transition-transform group-hover:scale-110 duration-300 shadow-lg shadow-emerald-500/20">
                  <ChefHat size={22} />
               </div>
               <span className="font-bold text-xl text-gray-900 hidden lg:block tracking-tight font-brand">
                  Restricted Diet <span className="text-emerald-600">Cookbook AI</span>
               </span>
               <span className="font-bold text-xl text-gray-900 hidden sm:block lg:hidden tracking-tight font-brand">
                  Cookbook <span className="text-emerald-600">AI</span>
               </span>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4 items-center">
               <Link href="/recipes" className={linkClass("/recipes")}>
                  <Search size={16} /> Browse
               </Link>
               <Link href="/wizard" className={linkClass("/wizard")}>
                  <PlusCircle size={16} /> Create
               </Link>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center">
              <Link href="/auth/profile">
                 <Button variant="ghost" size="sm" className="gap-2">
                    <UserCircle size={18} /> Profile
                 </Button>
              </Link>
          </div>

          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sm:hidden border-t">
          <div className="pt-2 pb-3 space-y-1 px-4">
            <Link 
                href="/recipes" 
                className={linkClass("/recipes") + " w-full"}
                onClick={() => setIsOpen(false)}
            >
              <Search size={16} /> Browse Recipes
            </Link>
            <Link 
                href="/wizard" 
                className={linkClass("/wizard") + " w-full"}
                onClick={() => setIsOpen(false)}
            >
              <PlusCircle size={16} /> Create Recipe
            </Link>
             <Link 
                href="/auth/profile" 
                className={linkClass("/auth/profile") + " w-full"}
                onClick={() => setIsOpen(false)}
            >
              <UserCircle size={16} /> Profile
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
