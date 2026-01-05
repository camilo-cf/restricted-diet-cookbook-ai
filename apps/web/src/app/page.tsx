import Link from "next/link";
import { ChefHat, Camera, Sparkles, Leaf } from "lucide-react";

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
    title: "Get AI Recipes",
    description: "Receive personalized, restriction-safe recipes",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
          <Leaf size={16} />
          Respecting Your Dietary Restrictions
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Restricted Diet
          </span>
          <br />
          <span className="text-gray-900">Cookbook AI</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Transform your available ingredients into delicious, 
          <strong className="text-gray-900"> safe recipes</strong> that respect 
          your allergies, intolerances, and lifestyle choices.
        </p>
        
        <Link
          href="/wizard"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200"
        >
          <Sparkles size={20} />
          Create Recipe
        </Link>
        
        <Link
          href="/recipes"
          className="ml-4 inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
        >
          Browse Community
        </Link>
      </section>

      {/* Features Section */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all duration-200 text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-xl mb-5">
                <feature.icon size={28} />
              </div>
              <div className="text-sm font-medium text-blue-600 mb-2">
                Step {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
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

