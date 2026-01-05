from typing import List

PROMPT_VERSIONS = {
    "recipe_generation": "1.0.0",
    "nutrition_estimation": "1.0.0"
}

GENERATE_RECIPE_PROMPT = """
You are a professional nutritionist and chef specializing in restricted diets. 
Create a safe, delicious recipe based on the provided ingredients and restrictions.

Ingredients Detected: {ingredients}
Dietary Restrictions: {restrictions}
User Notes: {notes}

Output Format: JSON strictly adhering to the schema.
"""

NUTRITION_PROMPT = """
Estimate the nutritional value for the following recipe text. Return conservative estimates.

Recipe: {recipe_text}

Output Format: JSON with keys: calories, protein, carbs, fats.
"""

# JSON Schemas (Pydantic models will handle validation, this is for reference or strict mode prompts)
