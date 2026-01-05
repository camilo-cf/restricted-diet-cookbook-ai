"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Camera, Loader2, Save, LogOut, ChefHat, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { resizeImage } from "@/lib/image";
import { useToast } from "@/components/ui/Toast";

const schema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().max(160, "Bio must be at most 160 characters").optional(),
});

type FormData = z.infer<typeof schema>;

const DIETARY_OPTIONS = [
    "Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb", "Nut-Free"
];

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await api.GET("/auth/me");
      if (error) {
          router.push("/login");
          return;
      }
      setUser(data);
      setSelectedPrefs(data.dietaryPreferences || []);
      reset({
          fullName: data.full_name,
          bio: data.bio || ""
      });
    } catch (err) {
      console.error(err);
      toast("Failed to load user profile.", "error");
    } finally {
      setLoading(false);
    }
  }, [router, reset, toast]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const togglePreference = (pref: string) => {
      setSelectedPrefs(prev => 
          prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
      );
  };

  const onUpdateProfile = async (data: FormData) => {
    setSaving(true);
    setSuccess(false);
    try {
      const { data: updatedUser, error } = await api.PATCH("/auth/me", {
        body: {
          full_name: data.fullName,
          bio: data.bio,
          dietaryPreferences: selectedPrefs
        },
      });

      if (error) throw error;
      setSuccess(true);
      setUser(updatedUser);
      toast("Profile updated successfully!", "success");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      toast("Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;
      setUploading(true);
      try {
          const originalFile = e.target.files[0];
          
          // Optimize image client-side before upload
          const file = await resizeImage(originalFile, 800);
          
          // 1. Presign
          const { data: presignData, error: presignError } = await api.POST("/uploads/presign", {
              body: {
                  filename: file.name,
                  contentType: file.type as any,
                  sizeBytes: file.size
              }
          });
          if (presignError) throw presignError;

          // 2. Upload
          const uploadRes = await fetch(presignData.uploadUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type }
          });
          if (!uploadRes.ok) throw new Error("Upload failed");

          // 3. Complete
          await api.POST("/uploads/complete", {
              body: { uploadId: presignData.uploadId }
          });

          // 4. Update Profile with new image
          const { data: updatedUser, error: updateError } = await api.PATCH("/auth/me", {
              body: { profileImageId: presignData.uploadId }
          });
          if (updateError) throw updateError;
          
          setUser(updatedUser);
          toast("Avatar updated!", "success");
      } catch (err) {
          console.error(err);
          toast("Failed to upload profile picture.", "error");
      } finally {
          setUploading(false);
      }
  };

  const handleLogout = async () => {
      await api.POST("/auth/logout");
      toast("Logged out successfully.", "info");
      router.push("/");
      router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8 pt-24">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-emerald-100">
            <div>
                <h1 className="text-4xl font-extrabold text-emerald-950 font-brand">Your Profile</h1>
                <p className="text-slate-600 mt-1">Manage your settings and dietary preferences</p>
            </div>
            <Button variant="ghost" className="text-slate-500 hover:text-red-600 transition-colors" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Log Out
            </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar: Photo & Stats */}
            <div className="space-y-6">
                <Card className="glass shadow-xl shadow-emerald-900/5 text-center overflow-hidden border-white/40">
                    <div className="h-24 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 w-full mb-[-3rem]"></div>
                    <CardContent className="pt-0">
                        <div className="relative inline-block group">
                            <div className="h-32 w-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-100 mb-4 transition-transform group-hover:scale-[1.02]">
                                {user.profileImageUrl ? (
                                    <img src={user.profileImageUrl} alt={user.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-emerald-600 bg-emerald-50">
                                        <User size={64} />
                                    </div>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                                        <Loader2 className="animate-spin text-emerald-600" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-6 right-0 h-10 w-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg cursor-pointer hover:bg-emerald-700 transition-all hover:scale-110 border-2 border-white">
                                <Camera size={18} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        </div>
                        <h3 className="text-xl font-bold text-emerald-950">{user.full_name}</h3>
                        <p className="text-sm text-slate-500">{user.email}</p>
                    </CardContent>
                </Card>

                <Card className="glass border-white/40 p-6 text-center">
                    <div className="flex items-center justify-center space-x-2 text-emerald-700 mb-2">
                        <ChefHat size={20} />
                        <span className="font-bold">Home Chef</span>
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Ready to cook</p>
                </Card>
            </div>

            {/* Main Info */}
            <div className="lg:col-span-2 space-y-8">
                <Card className="glass shadow-xl shadow-emerald-900/5 border-white/40 p-1">
                    <CardHeader className="pb-4">
                        <CardTitle className="font-brand">Account Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Display Name</label>
                                    <Input {...register("fullName")} className="bg-white/50 border-white/60 focus:bg-white" />
                                    {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Email Address (Read-only)</label>
                                    <Input value={user.email} disabled className="bg-slate-100/50 cursor-not-allowed border-transparent" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Bio</label>
                                <Textarea 
                                    {...register("bio")} 
                                    className="bg-white/50 border-white/60 focus:bg-white h-24 resize-none"
                                    placeholder="Tell us about your culinary journey..."
                                />
                                {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio.message}</p>}
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-semibold text-slate-700 block">Dietary Preferences</label>
                                <div className="flex flex-wrap gap-2">
                                    {DIETARY_OPTIONS.map(pref => (
                                        <Badge 
                                            key={pref}
                                            variant={selectedPrefs.includes(pref) ? "default" : "outline"}
                                            className={`
                                                px-4 py-2 text-sm rounded-xl cursor-pointer transition-all border-emerald-100
                                                ${selectedPrefs.includes(pref) 
                                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
                                                    : "bg-white text-emerald-800 hover:bg-emerald-50"}
                                            `}
                                            onClick={() => togglePreference(pref)}
                                        >
                                            {pref}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-2">These will be used to pre-fill your recipe generation wizard.</p>
                            </div>

                            <div className="flex items-center gap-4 pt-4 border-t border-emerald-50">
                                <Button 
                                    type="submit" 
                                    disabled={saving} 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 px-8"
                                >
                                    {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                                    Save Changes
                                </Button>
                                {success && (
                                    <div className="flex items-center text-emerald-600 font-semibold animate-in fade-in slide-in-from-left-2">
                                        <CheckCircle2 size={20} className="mr-2" />
                                        Profile Updated!
                                    </div>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
