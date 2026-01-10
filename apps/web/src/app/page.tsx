import Link from "next/link";
import { ChefHat, Camera, Sparkles, Leaf, Search } from "lucide-react";

const features = [
  {
    icon: ChefHat,
    title: "List Your Ingredients",
    description: "Tell us what you have in your kitchen",
  },
  {
    icon: Camera,
    title: "Upload a Photo",
    description: "Optionally snap a pic of your fridge or pantry",
  },
  {
    icon: Sparkles,
    title: "Draft with AI Support",
    description: "Get a safe, personalized recipe draft instantly",
  },
  {
    icon: ChefHat,
    title: "Refine & Make It Yours",
    description: "Edit ingredients and steps to perfect your creation",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-white">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-8 backdrop-blur-sm border border-emerald-200/50">
          <Leaf size={16} />
          Respecting Your Dietary Restrictions
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 font-brand leading-[1.1]">
          <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Restricted Diet
          </span>
          <br />
          <span className="text-gray-900">Cookbook AI</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
          Transform your available ingredients into delicious, 
          <strong className="text-emerald-700"> safe recipes</strong> that respect 
          your allergies, intolerances, and lifestyle choices.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
            href="/wizard"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-10 py-4 rounded-full text-lg font-bold shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-300"
            >
            <Sparkles size={20} />
            Create Recipe
            </Link>
            
            <Link
            href="/recipes"
            className="inline-flex items-center gap-2 glass px-10 py-4 rounded-full text-lg font-bold text-gray-700 hover:bg-white transition-all duration-300"
            >
            <Search size={20} className="text-emerald-600" />
            Browse Community
            </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-16 font-brand">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-white/50 backdrop-blur-sm p-6 md:p-8 rounded-3xl border border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 text-center group"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon size={feature.icon === Sparkles ? 24 : 28} />
              </div>
              <div className="text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wider">
                Step {index + 1}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-sm">
        Built with ❤️ for people with restricted diets
      </footer>
    </div>
  );
}

