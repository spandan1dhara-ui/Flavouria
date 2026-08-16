"""Realistic demo data for Flavouria: creators, recipes, ratings."""
import uuid
import re
from datetime import datetime, timezone

from database import db

# ---- Curated food imagery (stock) ----
IMG = {
    "biryani1": "https://images.unsplash.com/photo-1589302168068-964664d93dc0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "biryani2": "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "biryani3": "https://images.pexels.com/photos/23830980/pexels-photo-23830980.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "biryani4": "https://images.pexels.com/photos/4224304/pexels-photo-4224304.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "butter1": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "butter2": "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "paneer": "https://images.pexels.com/photos/11188417/pexels-photo-11188417.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "curries": "https://images.pexels.com/photos/10508207/pexels-photo-10508207.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "pasta1": "https://images.unsplash.com/photo-1608756687911-aa1599ab3bd9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "pasta2": "https://images.unsplash.com/photo-1546549032-9571cd6b27df?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "italianbowl": "https://images.unsplash.com/photo-1707870678076-40ba56a65ece?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "pizza1": "https://images.unsplash.com/photo-1575301544251-cd6891c3aaab?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "pizza2": "https://images.unsplash.com/photo-1715607873797-a173a95fd47c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "momos1": "https://images.unsplash.com/photo-1670300522639-ce378e5d23a1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "momos2": "https://images.unsplash.com/photo-1626322751504-930506dd41ca?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "cake1": "https://images.unsplash.com/photo-1774366126885-bef99f2f6d81?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "cake2": "https://images.unsplash.com/photo-1603194202969-12a5dbd29d34?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "cake3": "https://images.unsplash.com/photo-1635888070574-beb32aa9b06d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "samosa": "https://images.unsplash.com/photo-1601050690597-df0568f70950?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "dosa": "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "streetfood": "https://images.unsplash.com/photo-1732519970445-8f2d6998961f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "dosaplatter": "https://images.pexels.com/photos/941869/pexels-photo-941869.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "idli": "https://images.unsplash.com/photo-1589301773859-bb024d3ad558?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
}

AVA = {
    "a1": "https://images.unsplash.com/photo-1654922207993-2952fec328ae?crop=entropy&cs=srgb&fm=jpg&q=85&w=400",
    "a2": "https://images.unsplash.com/photo-1622021142947-da7dedc7c39a?crop=entropy&cs=srgb&fm=jpg&q=85&w=400",
    "a3": "https://images.unsplash.com/photo-1621494548002-bfc916172ead?crop=entropy&cs=srgb&fm=jpg&q=85&w=400",
    "a4": "https://images.unsplash.com/photo-1771862860802-bd2e375f7422?crop=entropy&cs=srgb&fm=jpg&q=85&w=400",
    "a5": "https://images.unsplash.com/photo-1757621788643-395dc581dc6d?crop=entropy&cs=srgb&fm=jpg&q=85&w=400",
}

YT = ["dQw4w9WgXcQ", "0zBhFLQoDrM", "a2P7z4vZ0Kk", "Mzj5J6h9Xk0", "9bZkp7q19f0",
      "kJQP7kiw5Fk", "hT_nvWreIhg", "3JZ_D3ELwOQ", "OPf0YbXqDm0", "fLexgOxsZu0"]

CREATORS = [
    {"slug": "rahuls-kitchen", "display_name": "Rahul's Kitchen", "avatar": AVA["a1"],
     "bio": "Home-style North Indian and Hyderabadi classics, cooked slow and honest."},
    {"slug": "bong-eats-home", "display_name": "Bong Eats Home", "avatar": AVA["a2"],
     "bio": "Bengali comfort food the way it's made in Kolkata kitchens."},
    {"slug": "awadhi-dastarkhan", "display_name": "Awadhi Dastarkhan", "avatar": AVA["a3"],
     "bio": "Royal Lucknowi and Awadhi cuisine, dum-cooked with patience."},
    {"slug": "nonna-lucia", "display_name": "Nonna Lucia", "avatar": AVA["a4"],
     "bio": "Authentic Italian pasta, pizza and dolci from a Bologna nonna."},
    {"slug": "wok-tales", "display_name": "Wok Tales", "avatar": AVA["a5"],
     "bio": "Fast, punchy Asian street food — dumplings, noodles and rice bowls."},
    {"slug": "sweet-alchemy", "display_name": "Sweet Alchemy", "avatar": AVA["a1"],
     "bio": "Bakes that actually work. Cakes, bread and everything sweet."},
    {"slug": "dakshin-diaries", "display_name": "Dakshin Diaries", "avatar": AVA["a2"],
     "bio": "South Indian breakfasts, dosas and filter-coffee mornings."},
    {"slug": "spice-route", "display_name": "Spice Route", "avatar": AVA["a3"],
     "bio": "Punjabi dhaba flavours and everyday Indian curries done right."},
]


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def ing(name, qty="", unit=""):
    return {"name": name, "quantity": str(qty), "unit": unit}


# ---- Recipe definitions ----
R = []


def add(title, creator, cuisine, region, category, diet, spice, diff, prep, cook, serv,
        tags, ingredients, steps, img, avg, count):
    R.append(dict(title=title, creator=creator, cuisine=cuisine, region=region, category=category,
                  diet=diet, spice=spice, diff=diff, prep=prep, cook=cook, serv=serv, tags=tags,
                  ingredients=ingredients, steps=steps, img=img, avg=avg, count=count))


_biryani_ing = [ing("Chicken", "500", "g"), ing("Basmati Rice", "500", "g"), ing("Yogurt", "1", "cup"),
                ing("Onion", "2"), ing("Tomato", "2"), ing("Ginger-Garlic Paste", "2", "tbsp"),
                ing("Saffron", "1", "pinch"), ing("Garam Masala", "1", "tbsp"), ing("Mint & Coriander", "1", "cup")]
_biryani_steps = ["Marinate the chicken in yogurt, ginger-garlic and spices for 1 hour.",
                  "Parboil the soaked basmati rice with whole spices until 70% done.",
                  "Fry onions till golden and prepare the masala base.",
                  "Layer the marinated chicken, rice, fried onions and saffron milk.",
                  "Seal the pot and cook on low dum for 25 minutes.",
                  "Rest for 10 minutes, then gently fluff and serve hot."]

add("Spicy Hyderabadi Chicken Biryani", "rahuls-kitchen", "Indian", "Hyderabadi", "Biryani",
    "Non-Vegetarian", "spicy", "Advanced", 40, 80, 4, ["biryani", "chicken", "rice", "hyderabadi", "spicy", "dum"],
    _biryani_ing, _biryani_steps, IMG["biryani1"], 4.9, 2431)
add("Bengali Aloo Chicken Biryani", "bong-eats-home", "Bengali", "Bengali", "Biryani",
    "Non-Vegetarian", "mild", "Medium", 35, 70, 4, ["biryani", "chicken", "rice", "bengali", "kolkata", "aloo"],
    _biryani_ing + [ing("Potato", "4")], _biryani_steps, IMG["biryani2"], 4.8, 1872)
add("Awadhi Chicken Biryani", "awadhi-dastarkhan", "Indian", "Awadhi", "Biryani",
    "Non-Vegetarian", "medium", "Advanced", 45, 90, 4, ["biryani", "chicken", "rice", "awadhi", "lucknowi", "dum"],
    _biryani_ing, _biryani_steps, IMG["biryani3"], 4.7, 934)
add("Lucknowi Dum Chicken Biryani", "awadhi-dastarkhan", "Indian", "Awadhi", "Biryani",
    "Non-Vegetarian", "medium", "Advanced", 45, 85, 5, ["biryani", "chicken", "rice", "lucknowi", "dum"],
    _biryani_ing, _biryani_steps, IMG["biryani4"], 4.6, 612)
add("Kolkata Egg Biryani", "bong-eats-home", "Bengali", "Bengali", "Biryani",
    "Egg", "mild", "Medium", 30, 60, 4, ["biryani", "egg", "rice", "kolkata"],
    [ing("Eggs", "6"), ing("Basmati Rice", "400", "g"), ing("Potato", "3"), ing("Onion", "2"),
     ing("Yogurt", "0.5", "cup"), ing("Biryani Masala", "1", "tbsp")], _biryani_steps, IMG["biryani2"], 4.5, 421)

# Butter chicken trio
_butter_ing = [ing("Chicken", "600", "g"), ing("Butter", "3", "tbsp"), ing("Tomato Puree", "2", "cup"),
               ing("Fresh Cream", "0.5", "cup"), ing("Cashew Paste", "3", "tbsp"), ing("Kasuri Methi", "1", "tsp"),
               ing("Ginger-Garlic Paste", "2", "tbsp"), ing("Kashmiri Chilli", "1", "tsp")]
_butter_steps = ["Marinate chicken in yogurt and spices, then char-grill or pan-sear.",
                 "Simmer a smooth tomato-cashew gravy with butter.",
                 "Add cream, kasuri methi and a touch of sugar to balance.",
                 "Fold in the grilled chicken and simmer 10 minutes.",
                 "Finish with a swirl of butter and cream; serve with naan."]
add("Creamy Butter Chicken", "spice-route", "Indian", "Punjabi", "Curry", "Non-Vegetarian", "mild",
    "Medium", 30, 45, 4, ["butter chicken", "murgh makhani", "chicken", "creamy", "punjabi"],
    _butter_ing, _butter_steps, IMG["butter1"], 4.9, 3120)
add("Dhaba-Style Butter Chicken", "rahuls-kitchen", "Indian", "Punjabi", "Curry", "Non-Vegetarian", "medium",
    "Medium", 30, 50, 4, ["butter chicken", "murgh makhani", "chicken", "dhaba", "smoky"],
    _butter_ing, _butter_steps, IMG["butter2"], 4.7, 1540)
add("Smoky Tandoori Butter Chicken", "spice-route", "Indian", "Punjabi", "Curry", "Non-Vegetarian", "spicy",
    "Advanced", 40, 55, 4, ["butter chicken", "tandoori", "chicken", "smoky", "spicy"],
    _butter_ing, _butter_steps, IMG["curries"], 4.6, 880)

# Momos trio
_momo_steps = ["Make a soft dough and rest it for 20 minutes.",
               "Mix the filling with finely chopped aromatics and seasoning.",
               "Roll thin wrappers and pleat with a spoon of filling.",
               "Steam for 8–10 minutes until glossy.",
               "Serve hot with fiery red chutney."]
add("Steamed Chicken Momos", "wok-tales", "Tibetan", "Himalayan", "Dumplings", "Non-Vegetarian", "medium",
    "Medium", 30, 20, 4, ["momos", "dumplings", "chicken", "steamed", "street food"],
    [ing("Minced Chicken", "300", "g"), ing("Flour", "2", "cup"), ing("Onion", "1"),
     ing("Garlic", "4", "cloves"), ing("Spring Onion", "3"), ing("Soy Sauce", "1", "tbsp")],
    _momo_steps, IMG["momos1"], 4.8, 1660)
add("Veg Steamed Momos", "wok-tales", "Tibetan", "Himalayan", "Dumplings", "Vegetarian", "mild",
    "Easy", 25, 15, 4, ["momos", "dumplings", "veg", "vegetarian", "steamed"],
    [ing("Cabbage", "2", "cup"), ing("Carrot", "1"), ing("Flour", "2", "cup"),
     ing("Garlic", "4", "cloves"), ing("Spring Onion", "3")], _momo_steps, IMG["momos2"], 4.6, 990)
add("Spicy Pan-Fried Momos", "wok-tales", "Tibetan", "Himalayan", "Dumplings", "Non-Vegetarian", "spicy",
    "Medium", 30, 25, 4, ["momos", "dumplings", "chicken", "fried", "spicy", "chilli"],
    [ing("Minced Chicken", "300", "g"), ing("Flour", "2", "cup"), ing("Schezwan Sauce", "3", "tbsp"),
     ing("Garlic", "5", "cloves")], _momo_steps, IMG["momos1"], 4.5, 540)

# Pasta trio
add("Classic Pasta Carbonara", "nonna-lucia", "Italian", "Roman", "Pasta", "Egg", "mild", "Medium",
    10, 20, 2, ["pasta", "carbonara", "spaghetti", "italian", "creamy", "egg"],
    [ing("Spaghetti", "200", "g"), ing("Guanciale", "100", "g"), ing("Egg Yolks", "3"),
     ing("Pecorino Romano", "50", "g"), ing("Black Pepper", "1", "tsp")],
    ["Boil spaghetti in salted water until al dente.", "Crisp the guanciale in a pan.",
     "Whisk egg yolks with grated pecorino and pepper.", "Toss hot pasta off the heat with the egg mix.",
     "Loosen with pasta water into a silky sauce and serve."], IMG["pasta1"], 4.9, 2210)
add("Penne Arrabbiata", "nonna-lucia", "Italian", "Roman", "Pasta", "Vegan", "spicy", "Easy",
    10, 20, 2, ["pasta", "arrabbiata", "penne", "italian", "spicy", "tomato", "vegan"],
    [ing("Penne", "200", "g"), ing("Tomato", "4"), ing("Garlic", "4", "cloves"),
     ing("Red Chilli Flakes", "1", "tsp"), ing("Olive Oil", "2", "tbsp")],
    ["Cook penne until al dente.", "Sizzle garlic and chilli in olive oil.",
     "Add crushed tomatoes and simmer into a rich sauce.", "Toss the pasta through the sauce.",
     "Finish with basil and olive oil."], IMG["italianbowl"], 4.7, 1180)
add("Creamy Alfredo Pasta", "nonna-lucia", "Italian", "Roman", "Pasta", "Vegetarian", "mild", "Easy",
    10, 20, 2, ["pasta", "alfredo", "fettuccine", "italian", "creamy", "cheese"],
    [ing("Fettuccine", "200", "g"), ing("Butter", "3", "tbsp"), ing("Parmesan", "60", "g"),
     ing("Cream", "0.5", "cup"), ing("Garlic", "2", "cloves")],
    ["Cook fettuccine al dente.", "Melt butter with garlic.", "Add cream and parmesan to a smooth sauce.",
     "Toss pasta with sauce and pasta water.", "Season and serve immediately."], IMG["pasta2"], 4.5, 760)

# Pizza trio
add("Pizza Margherita", "nonna-lucia", "Italian", "Neapolitan", "Pizza", "Vegetarian", "mild", "Medium",
    90, 12, 2, ["pizza", "margherita", "italian", "cheese", "basil", "neapolitan"],
    [ing("Pizza Dough", "1", "ball"), ing("San Marzano Tomato", "0.5", "cup"), ing("Mozzarella", "125", "g"),
     ing("Fresh Basil", "6", "leaves"), ing("Olive Oil", "1", "tbsp")],
    ["Stretch the proved dough by hand.", "Spread a thin layer of tomato.", "Top with torn mozzarella.",
     "Bake in the hottest oven for 8–12 minutes.", "Finish with basil and olive oil."], IMG["pizza1"], 4.8, 1990)
add("Pepperoni Pizza", "nonna-lucia", "Italian", "American", "Pizza", "Non-Vegetarian", "medium", "Medium",
    90, 14, 2, ["pizza", "pepperoni", "cheese", "meat"],
    [ing("Pizza Dough", "1", "ball"), ing("Tomato Sauce", "0.5", "cup"), ing("Mozzarella", "150", "g"),
     ing("Pepperoni", "80", "g")],
    ["Stretch the dough.", "Add sauce and cheese.", "Layer pepperoni generously.",
     "Bake until bubbling and crisp.", "Slice and serve."], IMG["pizza2"], 4.6, 1320)
add("Garden Veggie Pizza", "nonna-lucia", "Italian", "American", "Pizza", "Vegetarian", "mild", "Easy",
    90, 14, 2, ["pizza", "veg", "vegetarian", "vegetables", "cheese"],
    [ing("Pizza Dough", "1", "ball"), ing("Tomato Sauce", "0.5", "cup"), ing("Mozzarella", "150", "g"),
     ing("Bell Pepper", "1"), ing("Olives", "10"), ing("Onion", "1")],
    ["Stretch the dough.", "Spread sauce and cheese.", "Scatter chopped vegetables.",
     "Bake until golden.", "Serve hot."], IMG["pizza1"], 4.4, 610)

# Chocolate cake trio
_cake_steps = ["Cream butter and sugar until fluffy.", "Beat in eggs and vanilla.",
               "Fold in flour, cocoa and baking powder.", "Bake at 180°C for 30–35 minutes.",
               "Cool, then cover in glossy chocolate ganache."]
add("Molten Chocolate Cake", "sweet-alchemy", "Dessert", "Continental", "Dessert", "Vegetarian", "mild",
    "Medium", 20, 35, 6, ["chocolate cake", "dessert", "cake", "chocolate", "molten", "baking"],
    [ing("Dark Chocolate", "200", "g"), ing("Butter", "150", "g"), ing("Eggs", "3"),
     ing("Sugar", "150", "g"), ing("Flour", "100", "g"), ing("Cocoa", "2", "tbsp")],
    _cake_steps, IMG["cake1"], 4.9, 1780)
add("Classic Chocolate Fudge Cake", "sweet-alchemy", "Dessert", "American", "Dessert", "Vegetarian", "mild",
    "Easy", 25, 35, 8, ["chocolate cake", "dessert", "cake", "fudge", "chocolate", "baking"],
    [ing("Flour", "200", "g"), ing("Cocoa", "60", "g"), ing("Sugar", "250", "g"),
     ing("Eggs", "2"), ing("Butter", "150", "g"), ing("Milk", "1", "cup")],
    _cake_steps, IMG["cake2"], 4.7, 1240)
add("Eggless Chocolate Cake", "sweet-alchemy", "Dessert", "Continental", "Dessert", "Vegetarian", "mild",
    "Easy", 20, 35, 8, ["chocolate cake", "dessert", "cake", "eggless", "chocolate"],
    [ing("Flour", "200", "g"), ing("Cocoa", "60", "g"), ing("Condensed Milk", "1", "can"),
     ing("Butter", "100", "g"), ing("Baking Soda", "1", "tsp")],
    _cake_steps, IMG["cake3"], 4.5, 690)

# Chicken curry trio
_curry_steps = ["Sauté onions until golden.", "Add ginger-garlic and tomatoes; cook down.",
                "Add spices and bloom in oil.", "Add chicken and sear.",
                "Add water, cover and simmer until tender.", "Finish with coriander."]
add("Punjabi Chicken Curry", "spice-route", "Indian", "Punjabi", "Curry", "Non-Vegetarian", "medium",
    "Medium", 20, 45, 4, ["chicken curry", "chicken", "punjabi", "curry", "masala"],
    [ing("Chicken", "700", "g"), ing("Onion", "3"), ing("Tomato", "3"), ing("Ginger-Garlic Paste", "2", "tbsp"),
     ing("Turmeric", "1", "tsp"), ing("Chilli Powder", "2", "tsp"), ing("Garam Masala", "1", "tsp")],
    _curry_steps, IMG["curries"], 4.7, 1410)
add("Kadai Chicken", "rahuls-kitchen", "Indian", "North Indian", "Curry", "Non-Vegetarian", "spicy",
    "Medium", 20, 40, 4, ["chicken curry", "kadai", "chicken", "spicy", "capsicum"],
    [ing("Chicken", "700", "g"), ing("Bell Pepper", "2"), ing("Onion", "2"), ing("Tomato", "3"),
     ing("Kadai Masala", "2", "tbsp"), ing("Coriander Seeds", "1", "tbsp")],
    _curry_steps, IMG["butter2"], 4.6, 980)
add("Chettinad Chicken Curry", "dakshin-diaries", "South Indian", "Chettinad", "Curry", "Non-Vegetarian", "spicy",
    "Advanced", 25, 50, 4, ["chicken curry", "chettinad", "chicken", "spicy", "south indian", "pepper"],
    [ing("Chicken", "700", "g"), ing("Onion", "2"), ing("Coconut", "0.5", "cup"), ing("Black Pepper", "2", "tbsp"),
     ing("Curry Leaves", "2", "sprig"), ing("Dry Red Chilli", "5")],
    _curry_steps, IMG["curries"], 4.7, 720)

# Masala dosa trio
_dosa_steps = ["Soak rice and urad dal, then grind to a smooth batter.",
               "Ferment the batter overnight.", "Make a spiced potato masala filling.",
               "Spread the batter thin on a hot tawa.", "Add filling, fold and serve with chutney and sambar."]
add("Crispy Masala Dosa", "dakshin-diaries", "South Indian", "Karnataka", "Breakfast", "Vegetarian", "mild",
    "Advanced", 480, 20, 4, ["masala dosa", "dosa", "south indian", "breakfast", "potato", "crispy"],
    [ing("Dosa Rice", "3", "cup"), ing("Urad Dal", "1", "cup"), ing("Potato", "4"), ing("Onion", "2"),
     ing("Mustard Seeds", "1", "tsp"), ing("Curry Leaves", "1", "sprig"), ing("Turmeric", "0.5", "tsp")],
    _dosa_steps, IMG["dosa"], 4.8, 2050)
add("Mysore Masala Dosa", "dakshin-diaries", "South Indian", "Karnataka", "Breakfast", "Vegetarian", "medium",
    "Advanced", 480, 20, 4, ["masala dosa", "dosa", "mysore", "south indian", "breakfast", "spicy chutney"],
    [ing("Dosa Rice", "3", "cup"), ing("Urad Dal", "1", "cup"), ing("Potato", "4"),
     ing("Red Chutney", "0.5", "cup"), ing("Onion", "2")], _dosa_steps, IMG["dosaplatter"], 4.6, 1130)
add("Ghee Roast Dosa", "dakshin-diaries", "South Indian", "Karnataka", "Breakfast", "Vegetarian", "mild",
    "Medium", 480, 15, 4, ["masala dosa", "dosa", "ghee roast", "south indian", "breakfast", "crispy"],
    [ing("Dosa Batter", "4", "cup"), ing("Ghee", "4", "tbsp"), ing("Potato Masala", "2", "cup")],
    _dosa_steps, IMG["streetfood"], 4.5, 640)

# Extras / discovery
add("Paneer Butter Masala", "spice-route", "Indian", "Punjabi", "Curry", "Vegetarian", "mild", "Easy",
    15, 30, 4, ["paneer", "paneer butter masala", "curry", "vegetarian", "creamy"],
    [ing("Paneer", "300", "g"), ing("Tomato", "4"), ing("Cashew", "12"), ing("Butter", "2", "tbsp"),
     ing("Cream", "0.25", "cup"), ing("Kasuri Methi", "1", "tsp")],
    _butter_steps, IMG["paneer"], 4.8, 1890)
add("Amritsari Chole", "spice-route", "Indian", "Punjabi", "Curry", "Vegan", "medium", "Medium",
    480, 45, 4, ["chole", "chana", "chickpea", "punjabi", "vegan"],
    [ing("Chickpeas", "2", "cup"), ing("Onion", "2"), ing("Tomato", "3"), ing("Chole Masala", "2", "tbsp"),
     ing("Tea Bag", "1"), ing("Ginger", "1", "inch")],
    _curry_steps, IMG["curries"], 4.6, 870)
add("Rajma Masala", "rahuls-kitchen", "Indian", "North Indian", "Curry", "Vegan", "mild", "Easy",
    480, 40, 4, ["rajma", "kidney beans", "curry", "vegan", "comfort"],
    [ing("Kidney Beans", "2", "cup"), ing("Onion", "2"), ing("Tomato", "3"), ing("Garam Masala", "1", "tsp"),
     ing("Ginger-Garlic Paste", "1", "tbsp")], _curry_steps, IMG["curries"], 4.5, 760)
add("Idli with Sambar", "dakshin-diaries", "South Indian", "Tamil", "Breakfast", "Vegan", "mild", "Medium",
    480, 20, 4, ["idli", "sambar", "south indian", "breakfast", "steamed", "vegan"],
    [ing("Idli Rice", "3", "cup"), ing("Urad Dal", "1", "cup"), ing("Toor Dal", "1", "cup"),
     ing("Sambar Powder", "2", "tbsp"), ing("Vegetables", "2", "cup")],
    ["Ferment idli batter overnight.", "Steam idlis until fluffy.", "Cook dal for sambar.",
     "Simmer sambar with vegetables and powder.", "Serve idli hot with sambar and chutney."],
    IMG["idli"], 4.6, 980)
add("Crispy Punjabi Samosa", "spice-route", "Indian", "Punjabi", "Snack", "Vegan", "medium", "Medium",
    30, 30, 6, ["samosa", "snack", "street food", "potato", "fried", "vegan"],
    [ing("Flour", "2", "cup"), ing("Potato", "4"), ing("Green Peas", "0.5", "cup"),
     ing("Cumin", "1", "tsp"), ing("Garam Masala", "1", "tsp")],
    ["Make a stiff dough.", "Prepare spiced potato-pea filling.", "Shape cones and fill.",
     "Seal and deep-fry on low heat until golden.", "Serve with chutney."], IMG["samosa"], 4.7, 1450)
add("Classic Lasagna", "nonna-lucia", "Italian", "Emilian", "Pasta", "Non-Vegetarian", "mild", "Advanced",
    40, 60, 6, ["lasagna", "pasta", "italian", "baked", "cheese", "beef"],
    [ing("Lasagna Sheets", "12"), ing("Minced Meat", "500", "g"), ing("Tomato", "4"),
     ing("Bechamel", "2", "cup"), ing("Parmesan", "80", "g")],
    ["Cook a rich meat ragu.", "Make a smooth bechamel.", "Layer sheets, ragu and bechamel.",
     "Top with parmesan.", "Bake until golden and bubbling."], IMG["pasta2"], 4.6, 830)
add("Veg Hakka Fried Rice", "wok-tales", "Chinese", "Indo-Chinese", "Rice", "Vegetarian", "medium", "Easy",
    15, 15, 3, ["fried rice", "hakka", "chinese", "rice", "veg", "wok"],
    [ing("Cooked Rice", "3", "cup"), ing("Carrot", "1"), ing("Capsicum", "1"), ing("Spring Onion", "3"),
     ing("Soy Sauce", "2", "tbsp"), ing("Garlic", "4", "cloves")],
    ["Heat the wok until smoking.", "Stir-fry garlic and vegetables.", "Add cold cooked rice.",
     "Toss with soy sauce on high heat.", "Finish with spring onions."], IMG["italianbowl"], 4.4, 690)
add("Shoyu Chicken Ramen", "wok-tales", "Japanese", "Japanese", "Noodles", "Non-Vegetarian", "medium", "Advanced",
    30, 90, 2, ["ramen", "noodles", "japanese", "chicken", "soup", "shoyu"],
    [ing("Ramen Noodles", "2", "portions"), ing("Chicken", "400", "g"), ing("Soy Sauce", "4", "tbsp"),
     ing("Egg", "2"), ing("Spring Onion", "2"), ing("Nori", "2", "sheets")],
    ["Simmer a deep chicken broth.", "Season with a shoyu tare.", "Cook noodles separately.",
     "Prepare toppings and soft eggs.", "Assemble broth, noodles and toppings."], IMG["momos2"], 4.5, 540)
add("Dal Makhani", "rahuls-kitchen", "Indian", "Punjabi", "Curry", "Vegetarian", "mild", "Medium",
    480, 60, 4, ["dal makhani", "dal", "lentil", "punjabi", "creamy", "vegetarian"],
    [ing("Black Urad Dal", "1", "cup"), ing("Kidney Beans", "0.25", "cup"), ing("Butter", "3", "tbsp"),
     ing("Cream", "0.25", "cup"), ing("Tomato", "3")],
    ["Soak and boil dal with rajma until soft.", "Prepare a buttery tomato base.",
     "Simmer dal low and slow for an hour.", "Finish with cream and butter.", "Serve with naan or rice."],
    IMG["curries"], 4.7, 1210)


async def seed():
    if await db.recipes.count_documents({}) > 0:
        return
    now = datetime.now(timezone.utc).isoformat()
    # creator users + creator profiles
    creator_id_by_slug = {}
    for i, c in enumerate(CREATORS):
        user_id = str(uuid.uuid4())
        creator_id = str(uuid.uuid4())
        email = f"{c['slug']}@flavouria.com"
        from auth import hash_password
        await db.users.update_one(
            {"email": email},
            {"$setOnInsert": {
                "id": user_id, "email": email, "name": c["display_name"],
                "password_hash": hash_password("Creator@2026"), "role": "creator",
                "picture": c["avatar"], "preferences": {}, "auth_provider": "password",
                "creator_id": creator_id, "created_at": now,
            }},
            upsert=True,
        )
        udoc = await db.users.find_one({"email": email}, {"_id": 0})
        user_id = udoc["id"]
        creator_id = udoc.get("creator_id", creator_id)
        await db.creators.update_one(
            {"slug": c["slug"]},
            {"$set": {
                "id": creator_id, "user_id": user_id, "slug": c["slug"],
                "display_name": c["display_name"], "bio": c["bio"], "avatar": c["avatar"],
                "created_at": now, "rating_avg": 0, "rating_count": 0, "recipe_count": 0,
                "top3_appearances": 0, "total_views": 0,
            }},
            upsert=True,
        )
        creator_id_by_slug[c["slug"]] = creator_id

    used_slugs = set()
    for r in R:
        base = slugify(r["title"])
        slug = base
        n = 2
        while slug in used_slugs:
            slug = f"{base}-{n}"; n += 1
        used_slugs.add(slug)
        rating_sum = round(r["avg"] * r["count"])
        doc = {
            "id": str(uuid.uuid4()), "slug": slug, "title": r["title"], "description":
                f"A {r['spice']} {r['region']} {r['category'].lower()} — {r['title']}. Made with trusted, "
                f"authentic ingredients and clear step-by-step method.",
            "thumbnail": r["img"], "creator_id": creator_id_by_slug[r["creator"]],
            "cuisine": r["cuisine"], "region": r["region"], "category": r["category"], "diet": r["diet"],
            "spice_level": r["spice"], "difficulty": r["diff"], "prep_time": r["prep"], "cook_time": r["cook"],
            "servings": r["serv"], "tags": r["tags"], "ingredients": r["ingredients"], "instructions": r["steps"],
            "youtube_id": YT[len(used_slugs) % len(YT)], "status": "PUBLISHED",
            "views": 400 + (r["count"] * 3), "selection_count": r["count"] // 3, "saves_count": r["count"] // 10,
            "rating_avg": r["avg"], "rating_count": r["count"], "rating_sum": rating_sum,
            "created_at": now,
        }
        await db.recipes.insert_one(doc)

    # aggregate creator stats
    for slug, cid in creator_id_by_slug.items():
        recs = await db.recipes.find({"creator_id": cid}, {"_id": 0}).to_list(500)
        rc = len(recs)
        total_ratings = sum(x["rating_count"] for x in recs)
        weighted = sum(x["rating_avg"] * x["rating_count"] for x in recs)
        avg = round(weighted / total_ratings, 2) if total_ratings else 0
        views = sum(x["views"] for x in recs)
        await db.creators.update_one({"id": cid}, {"$set": {
            "recipe_count": rc, "rating_count": total_ratings, "rating_avg": avg,
            "total_views": views, "top3_appearances": min(rc, 6),
        }})
