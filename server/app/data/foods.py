"""Carbs live on the server only.

The child's app shows food cards and a text box but never a number of grams: carb counting is the grown-ups'
job (light-client/src/data/foods.ts has the same cards without the carbs). `id`s match that file.
Grams are for one typical child portion.
"""

FOODS: list[dict] = [
    {"id": "pizza", "name": "Pizza slice", "carbs": 30, "synonyms": ["pizza", "pizza slice", "margherita", "pepperoni"]},
    {"id": "sandwich", "name": "Sandwich", "carbs": 30, "synonyms": ["sandwich", "sub", "panini", "wrap", "baguette"]},
    {"id": "pasta", "name": "Pasta (1 cup)", "carbs": 40, "synonyms": ["pasta", "spaghetti", "noodles", "macaroni", "mac and cheese", "lasagna"]},
    {"id": "rice", "name": "Rice (1 cup)", "carbs": 45, "synonyms": ["rice", "risotto", "fried rice", "paella"]},
    {"id": "cereal", "name": "Cereal bowl", "carbs": 30, "synonyms": ["cereal", "cornflakes", "porridge", "oatmeal", "granola", "muesli"]},
    {"id": "burger", "name": "Burger", "carbs": 35, "synonyms": ["burger", "hamburger", "cheeseburger"]},
    {"id": "fries", "name": "Small fries", "carbs": 30, "synonyms": ["fries", "chips", "french fries", "potato"]},
    {"id": "bread", "name": "Bread slice", "carbs": 15, "synonyms": ["bread", "toast", "roll", "bun", "pita"]},
    {"id": "apple", "name": "Apple", "carbs": 15, "synonyms": ["apple", "applesauce"]},
    {"id": "pear", "name": "Pear", "carbs": 25, "synonyms": ["pear", "banana", "mango"]},
    {"id": "grapes", "name": "Grapes (handful)", "carbs": 15, "synonyms": ["grapes", "berries", "strawberries", "blueberries"]},
    {"id": "milk", "name": "Milk (1 cup)", "carbs": 12, "synonyms": ["milk", "yoghurt", "yogurt", "smoothie"]},
    {"id": "juice", "name": "Juice (1 cup)", "carbs": 25, "synonyms": ["juice", "orange juice", "apple juice", "soda", "lemonade"]},
    {"id": "cookie", "name": "Cookie", "carbs": 10, "synonyms": ["cookie", "biscuit", "cracker"]},
    {"id": "icecream", "name": "Ice cream", "carbs": 20, "synonyms": ["ice cream", "icecream", "gelato", "frozen yoghurt"]},
    {"id": "carrot", "name": "Carrots", "carbs": 5, "synonyms": ["carrot", "carrots", "salad", "broccoli", "cucumber", "vegetables"]},
]

BY_ID = {f["id"]: f for f in FOODS}

# Extra kitchen-table words the cards don't cover, so the offline fallback recognises more of what a child types.
EXTRAS: dict[str, tuple[str, int]] = {
    "cake": ("Cake", 40),
    "chocolate": ("Chocolate", 25),
    "sweets": ("Sweets", 25),
    "candy": ("Sweets", 25),
    "croissant": ("Croissant", 25),
    "pancake": ("Pancakes", 30),
    "waffle": ("Waffles", 30),
    "donut": ("Doughnut", 30),
    "doughnut": ("Doughnut", 30),
    "nuggets": ("Chicken nuggets", 15),
    "chicken": ("Chicken", 0),
    "egg": ("Egg", 0),
    "eggs": ("Eggs", 0),
    "cheese": ("Cheese", 0),
    "fish": ("Fish", 0),
    "soup": ("Soup", 15),
    "sushi": ("Sushi (6 pieces)", 40),
    "taco": ("Taco", 20),
    "burrito": ("Burrito", 50),
    "popcorn": ("Popcorn", 15),
    "water": ("Water", 0),
}
