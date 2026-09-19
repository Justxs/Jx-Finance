import type { CategoryResponse } from "@/api/generated/model";
import { ids } from "./base";

function category(
  id: string,
  name: string,
  type: CategoryResponse["type"],
  icon: string | null,
  isDefault: boolean,
  householdId: string | null = null,
): CategoryResponse {
  return {
    id,
    name,
    type,
    icon,
    isDefault,
    scope: householdId ? "shared" : "personal",
    householdId,
  };
}

export const categories: CategoryResponse[] = [
  category(ids.categories.salary, "Atlyginimas", "income", "briefcase", true),
  category(ids.categories.sideIncome, "Papildomos pajamos", "income", "coins", false),
  category(ids.categories.gifts, "Dovanos", "income", "gift", true),
  category(ids.categories.food, "Maistas", "expense", "utensils", true),
  category(ids.categories.transport, "Transportas", "expense", "bus", true),
  category(ids.categories.utilities, "Komunaliniai mokesčiai", "expense", "lightbulb", true),
  category(ids.categories.telecom, "Ryšiai ir internetas", "expense", "wifi", false),
  category(ids.categories.housing, "Būstas", "expense", "home", true),
  category(ids.categories.entertainment, "Pramogos", "expense", "clapperboard", false),
  category(ids.categories.health, "Sveikata", "expense", "heart-pulse", true),
  category(ids.categories.cafes, "Kavinės ir restoranai", "expense", "coffee", false),
  category(ids.categories.shopping, "Apsipirkimas", "expense", "shopping-bag", false),
  category(
    ids.categories.householdGoods,
    "Namų ūkio prekės, remontas ir sodo priežiūra (bendra)",
    "expense",
    "shapes",
    false,
    ids.households.family,
  ),
  category(ids.categories.noIcon, "Kita", "expense", null, false),
];

export const incomeCategories: CategoryResponse[] = categories.filter(
  (item) => item.type === "income",
);

export const expenseCategories: CategoryResponse[] = categories.filter(
  (item) => item.type === "expense",
);
