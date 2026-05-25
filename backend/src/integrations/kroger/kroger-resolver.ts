import axios from 'axios';
import { krogerAuth } from './kroger-auth';

const KROGER_API = process.env.KROGER_API_BASE_URL || 'https://api-ce.kroger.com/v1';

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
  /**
   * Searches the Kroger Products API using ClientContext (client_credentials,
   * scope: product.compact) as required by the Products API v1.3.0 spec.
   *
   * filter.locationId is required to receive price and fulfillment data.
   * Supported params: filter.term, filter.brand, filter.locationId, filter.limit, filter.start.
   */
  async searchProduct(
    query: string,
    locationId: string,
    options: { brand?: string; limit?: number; start?: number } = {}
  ): Promise<KrogerProduct[]> {
    const accessToken = await krogerAuth.getClientCredentialsToken();

    const params: Record<string, string | number> = {
      'filter.term': query,
      'filter.locationId': locationId,
      'filter.limit': options.limit ?? 5,
    };
    if (options.brand) params['filter.brand'] = options.brand;
    if (options.start !== undefined) params['filter.start'] = options.start;

    const { data } = await axios.get(`${KROGER_API}/products`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
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
    ingredients: Array<{ name: string; quantity: number; unit?: string }>,
    locationId: string
  ): Promise<Array<{ ingredient: string; product: KrogerProduct | null; quantity: number; unit?: string }>> {
    const results = await Promise.allSettled(
      ingredients.map(async (ing) => {
        const products = await krogerResolver.searchProduct(ing.name, locationId, { limit: 1 });
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
