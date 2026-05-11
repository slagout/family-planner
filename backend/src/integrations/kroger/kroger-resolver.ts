import axios from 'axios';
import { krogerAuth } from './kroger-auth';

const KROGER_API = 'https://api.kroger.com/v1';

export interface KrogerProduct {
  productId: string;
  upc: string;
  description: string;
  brand: string;
  size: string;
  price: number | null;
  inStock: boolean;
  locationId: string;
}

export const krogerResolver = {
  async searchProduct(
    userId: string,
    query: string,
    locationId: string,
    limit = 5
  ): Promise<KrogerProduct[]> {
    const tokens = await krogerAuth.getValidTokens(userId);
    if (!tokens) throw new Error(`No Kroger tokens for user ${userId}. OAuth required.`);

    const { data } = await axios.get(`${KROGER_API}/products`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      params: {
        'filter.term': query,
        'filter.locationId': locationId,
        'filter.limit': limit,
      },
    });

    return (data.data || []).map((p: any) => ({
      productId: p.productId,
      upc: p.upc || '',
      description: p.description,
      brand: p.brand || '',
      size: p.items?.[0]?.size || '',
      price: p.items?.[0]?.price?.regular || null,
      inStock: p.items?.[0]?.fulfillment?.inStore ?? true,
      locationId,
    }));
  },

  async resolveIngredients(
    userId: string,
    ingredients: Array<{ name: string; quantity: number; unit?: string }>,
    locationId: string
  ): Promise<Array<{ ingredient: string; product: KrogerProduct | null; quantity: number; unit?: string }>> {
    const results = await Promise.allSettled(
      ingredients.map(async (ing) => {
        const products = await krogerResolver.searchProduct(userId, ing.name, locationId, 1);
        return {
          ingredient: ing.name,
          product: products[0] || null,
          quantity: ing.quantity,
          unit: ing.unit,
        };
      })
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      console.error(`[Kroger] Failed to resolve ingredient ${ingredients[i].name}:`, r.reason);
      return { ingredient: ingredients[i].name, product: null, quantity: ingredients[i].quantity, unit: ingredients[i].unit };
    });
  },
};
