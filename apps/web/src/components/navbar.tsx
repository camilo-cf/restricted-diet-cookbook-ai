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
                  <ChefHat size={22} />
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
                                    <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
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
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sm:hidden border-t">
          <div className="pt-2 pb-3 space-y-1 px-4 bg-white/80 backdrop-blur-md">
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
            {user ? (
                <>
                    <Link 
                        href="/profile" 
                        className={linkClass("/profile") + " w-full"}
                        onClick={() => setIsOpen(false)}
                    >
                        <UserCircle size={16} /> My Profile
                    </Link>
                    <button 
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left"
                        onClick={async () => {
                            await api.POST("/auth/logout");
                            window.location.href = "/";
                            setIsOpen(false);
                        }}
                    >
                        <LogOut size={16} /> Log Out
                    </button>
                </>
            ) : (
                <>
                    <Link 
                        href="/login" 
                        className={linkClass("/login") + " w-full"}
                        onClick={() => setIsOpen(false)}
                    >
                        Sign In
                    </Link>
                    <Link 
                        href="/register" 
                        className={linkClass("/register") + " w-full"}
                        onClick={() => setIsOpen(false)}
                    >
                        Sign Up
                    </Link>
                </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
