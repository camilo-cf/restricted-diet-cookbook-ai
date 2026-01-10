"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Search, PlusCircle, UserCircle, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { api } from "@/lib/api";

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
        try {
            const { data, error } = await api.GET("/auth/me");
            if (!error) {
                setUser(data);
            } else {
                setUser(null);
            }
        } catch (e) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };
    fetchUser();
  }, [pathname]); // Refresh on navigation

  const isActive = (path: string) => pathname === path;
  const linkClass = (path: string) => `
    flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
    ${isActive(path) ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
  `;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-emerald-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
                <div className="bg-emerald-600 text-white p-2 rounded-xl transition-transform group-hover:scale-110 duration-300 shadow-lg shadow-emerald-500/20">
                   <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chef-hat "><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"></path><line x1="6" x2="18" y1="17" y2="17"></line></svg>
                </div>
               <span className="font-bold text-xl text-gray-900 hidden lg:block tracking-tight font-brand">
                  Restricted Diet <span className="text-emerald-600">Cookbook AI</span>
               </span>
               <span className="font-bold text-xl text-gray-900 hidden sm:block lg:hidden tracking-tight font-brand">
                   AI <span className="text-emerald-600">Cookbook</span>
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
          
          <div className="hidden sm:flex items-center gap-2">
              {!loading && (
                  user ? (
                      <div className="flex items-center gap-2 pl-4 border-l border-emerald-100 ml-2">
                        <Link href="/profile" className="flex items-center gap-2 hover:bg-emerald-50 p-1.5 rounded-2xl transition-all group">
                            <div className="h-8 w-8 rounded-xl overflow-hidden bg-emerald-100 text-emerald-700 flex items-center justify-center border border-white shadow-sm">
                                {user.profileImageUrl ? (
                                    <img src={user.profileImageUrl} alt={`Avatar for ${user.full_name}`} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-bold text-xs">{user.full_name[0]}</span>
                                )}
                            </div>
                            <span className="text-sm font-bold text-slate-700 pr-1 group-hover:text-emerald-700 transition-colors">
                                {user.full_name}
                            </span>
                        </Link>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-slate-500 hover:text-red-600 px-2"
                            onClick={async () => {
                                await api.POST("/auth/logout");
                                window.location.href = "/";
                            }}
                        >
                            <LogOut size={18} />
                        </Button>
                      </div>
                  ) : (
                      <div className="flex items-center gap-2">
                        <Link href="/login">
                            <Button variant="ghost" size="sm" className="font-bold text-slate-600">
                                Log In
                            </Button>
                        </Link>
                        <Link href="/register">
                            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-md shadow-emerald-200">
                                Sign Up
                            </Button>
                        </Link>
                      </div>
                  )
              )}
          </div>

          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Menu"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sm:hidden border-t bg-white/95 backdrop-blur-md animate-in slide-in-from-top duration-300">
          <div className="px-4 pt-4 pb-6 space-y-3">
            <Link 
                href="/recipes" 
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-transparent hover:border-emerald-100"
                onClick={() => setIsOpen(false)}
            >
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <Search size={20} />
              </div>
              Browse Recipes
            </Link>
            <Link 
                href="/wizard" 
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-transparent hover:border-emerald-100"
                onClick={() => setIsOpen(false)}
            >
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <PlusCircle size={20} />
              </div>
              Create Recipe
            </Link>
            
            <div className="my-2 border-t border-gray-100 pt-2" />

            {user ? (
                <div className="space-y-3">
                    <Link 
                        href="/profile" 
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-transparent hover:border-emerald-100"
                        onClick={() => setIsOpen(false)}
                    >
                        <div className="h-9 w-9 rounded-lg overflow-hidden bg-emerald-100 text-emerald-700 flex items-center justify-center border border-white shadow-sm">
                            {user.profileImageUrl ? (
                                <img src={user.profileImageUrl} alt={`Avatar for ${user.full_name}`} className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-bold text-sm">{user.full_name[0]}</span>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold leading-none">{user.full_name}</span>
                            <span className="text-xs text-slate-500 font-normal mt-1">View Profile</span>
                        </div>
                    </Link>
                    <button 
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-red-600 hover:bg-red-50 w-full text-left transition-all border border-transparent hover:border-red-100"
                        onClick={async () => {
                            await api.POST("/auth/logout");
                            window.location.href = "/";
                            setIsOpen(false);
                        }}
                    >
                        <div className="bg-red-100 p-2 rounded-lg text-red-600">
                            <LogOut size={20} />
                        </div>
                        Log Out
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Link 
                        href="/login" 
                        className="flex items-center justify-center h-12 rounded-xl text-base font-bold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                        onClick={() => setIsOpen(false)}
                    >
                        Log In
                    </Link>
                    <Link 
                        href="/register" 
                        className="flex items-center justify-center h-12 rounded-xl text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all"
                        onClick={() => setIsOpen(false)}
                    >
                        Sign Up
                    </Link>
                </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
