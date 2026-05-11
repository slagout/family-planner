import axios from 'axios';
import { krogerAuth } from './kroger-auth';

const KROGER_API = 'https://api.kroger.com/v1';

export interface CartItem {
  upc: string;
  quantity: number;
  modality?: 'PICKUP' | 'SHIP' | 'DELIVERY';
}

export const krogerCart = {
  async addToCart(userId: string, items: CartItem[]): Promise<void> {
    const tokens = await krogerAuth.getValidTokens(userId);
    if (!tokens) throw new Error(`No Kroger tokens for user ${userId}. OAuth required.`);

    await axios.put(
      `${KROGER_API}/cart/add`,
      {
        items: items.map((item) => ({
          upc: item.upc,
          quantity: item.quantity,
          modality: item.modality || 'PICKUP',
        })),
      },
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  },

  async getMissingIngredients(
    recipeIngredients: Array<{ name: string; quantity: number; unit?: string; krogerUpc?: string }>,
    pantryItems: Array<{ name: string; quantity: number; unit?: string }>
  ): Promise<Array<{ name: string; quantity: number; unit?: string; krogerUpc?: string }>> {
    const pantryMap = new Map(pantryItems.map((p) => [p.name.toLowerCase(), p]));

    return recipeIngredients.filter((ing) => {
      const pantryItem = pantryMap.get(ing.name.toLowerCase());
      if (!pantryItem) return true;
      return pantryItem.quantity < ing.quantity;
    });
  },
};
