import express, { Request, Response } from "express";
import {
  getData,
  setData,
  Recipe,
  Ingredient,
  RequiredItem,
} from "./dataStore";

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: any = null;

// Task 1 helper (don't touch)
app.post("/parse", (req: Request, res: Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input);
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  }
  res.json({ msg: parsed_string });
  return;
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that
const parse_handwriting = (recipeName: string): string | null => {
  if (!recipeName) return null;

  // hyphens and underscores replace with whitespace
  let formatted = recipeName.replace(/[-_]/g, " ");

  // food name contains letters and whitespaces only
  formatted = formatted.replace(/[^a-zA-Z\s]/g, "");

  // cap the first letter in a word, lowercase for others
  // squeeze whites spaces between words
  formatted = formatted
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return formatted.length > 0 ? formatted : null;
};

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req: Request, res: Response) => {
  const newEntry = req.body as Recipe | Ingredient;
  const store = getData();

  // validate type
  if (newEntry.type !== "recipe" && newEntry.type !== "ingredient") {
    return res.status(400).send({
      error: "Invalid type. Type can only be 'recipe' or 'ingredient'.",
    });
  }

  // validate cook time
  if (newEntry.type === "ingredient") {
    const ingredient = newEntry as Ingredient;
    if (ingredient.cookTime < 0) {
      return res.status(400).send({ error: "cookTime can only be >= 0." });
    }
  }

  // entry names must be unique
  if (store.cookbookEntries.some((entry) => entry.name === newEntry.name)) {
    return res.status(400).send({ error: "Entry name must be unique." });
  }

  // unique name for recipe requiredItems
  if (newEntry.type === "recipe") {
    const recipe = newEntry as Recipe;
    const itemNames = new Set();
    for (const item of recipe.requiredItems) {
      if (itemNames.has(item.name)) {
        return res
          .status(400)
          .send({ error: "Recipe requiredItems must have unique names." });
      }
      itemNames.add(item.name);
    }
  }

  store.cookbookEntries.push(newEntry);
  setData(store);

  return res.status(200).send();
});

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req: Request, res: Request) => {
  const { name } = req.query;
  const cookbook = getData().cookbookEntries;

  // A recipe with the corresponding name cannot be found.
  const recipe = cookbook.find((entry) => entry.name === name);
  if (!recipe) {
    return res.status(400).send(`${name} not found`);
  }

  // The searched name is NOT a recipe name (ie. an ingredient).
  if (recipe.type !== "recipe") {
    return res.status(400).send(`${name} is NOT a recipe name`);
  }

  const getIngredients = (
    item: RequiredItem
  ): { name: string; quantity: number; cookTime: number }[] => {
    const ingredient = cookbook.find((entry) => entry.name === item.name);

    // The recipe contains recipes or ingredients that aren't in the cookbook.
    if (!ingredient) {
      throw new Error(`Ingredient ${item.name} not found in cookbook`);
    }

    if (ingredient.type === "ingredient") {
      return [
        {
          name: ingredient.name,
          quantity: item.quantity,
          cookTime: (ingredient as Ingredient).cookTime,
        },
      ];
    } else {
      let allIngredients: {
        name: string;
        quantity: number;
        cookTime: number;
      }[] = [];
      if ((ingredient as Recipe).requiredItems) {
        for (const requiredItem of (ingredient as Recipe).requiredItems) {
          allIngredients = allIngredients.concat(getIngredients(requiredItem));
        }
        return allIngredients;
      }
    }
  };

  try {
    let totalCookTime = 0;
    let ingredientSummary: {
      [key: string]: { quantity: number; cookTime: number };
    } = {};

    for (const requiredItem of (recipe as Recipe).requiredItems) {
      const ingredients = getIngredients(requiredItem);
      ingredients.forEach((ingredient) => {
        if (!ingredientSummary[ingredient.name]) {
          ingredientSummary[ingredient.name] = { quantity: 0, cookTime: 0 };
          ingredientSummary[ingredient.name].cookTime = ingredient.cookTime;
        }
        ingredientSummary[ingredient.name].quantity += ingredient.quantity;
      });
    }

    //  total cook time
    for (const ingredient in ingredientSummary) {
      totalCookTime +=
        ingredientSummary[ingredient].cookTime *
        ingredientSummary[ingredient].quantity;
    }

    const ingredients = Object.keys(ingredientSummary).map((name) => ({
      name,
      quantity: ingredientSummary[name].quantity,
    }));

    return res.json({
      name: recipe.name,
      cookTime: totalCookTime,
      ingredients,
    });
  } catch (error) {
    return res.status(400).send(error.message);
  }
});

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
