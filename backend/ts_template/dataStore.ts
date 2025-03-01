import fs from "fs";

// === Type Definitions ========================================================
export interface CookbookEntry {
  name: string;
  type: "recipe" | "ingredient";
}

export default interface RequiredItem {
  name: string;
  quantity: number;
}

export interface Recipe extends CookbookEntry {
  requiredItems: RequiredItem[];
}

export interface Ingredient extends CookbookEntry {
  cookTime: number;
}

// Data store
export interface DataStore {
  cookbookEntries: (Recipe | Ingredient)[];
}

const dataStore: DataStore = { cookbookEntries: [] };

// getter and setter

export const getData = (): DataStore => dataStore;

const save = () => {
  fs.writeFileSync("./database.json", JSON.stringify(getData(), null, 2));
};

export const setData = (newData: DataStore): void => {
  dataStore.cookbookEntries = newData.cookbookEntries;
  save(); // auto save
};

const load = () => {
  if (fs.existsSync("./database.json")) {
    const file = fs.readFileSync("./database.json", { encoding: "utf8" });

    if (file.trim() === "") {
      // initialise with default data
      setData({ cookbookEntries: [] });
    } else {
      setData(JSON.parse(file));
    }
  }
};
load();
