/**
 * krogerService.ts — Legacy menu-planner facade over the Kroger integrations.
 *
 * Context rules (per Kroger OpenAPI specs):
 *  - Products API (GET /v1/products): ClientContext — client_credentials, scope: product.compact
 *  - Cart API (PUT /v1/cart/add):     CustomerContext — authorization_code, scope: cart.basic:write
 *
 * This service uses ClientContext (client_credentials) for product resolution only.
 * Cart operations that require a specific user's CustomerContext token are handled
 * separately via krogerAuth.getValidTokens(userId) in krogerCart.addToCart().
 */
import axios from 'axios';
import { MissingIngredient } from '../types';
import { krogerAuth } from '../integrations/kroger/kroger-auth';

const KROGER_API = process.env.KROGER_API_BASE_URL || 'https://api-ce.kroger.com/v1';

interface CartResult {
  cartId: string;
  unmatchedIngredients: string[];
}

/**
 * Searches for a product UPC using ClientContext (product.compact scope).
 */
async function searchProductUpc(accessToken: string, term: string): Promise<string | null> {
  try {
    const response = await axios.get(`${KROGER_API}/products`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        'filter.term': term,
        'filter.limit': 1,
      },
    });
    const product = response.data?.data?.[0];
    return product?.items?.[0]?.itemId || product?.productId || null;
  } catch {
    return null;
  }
}

/**
 * Resolves ingredient UPCs via ClientContext, then adds items to the Kroger cart
 * using the provided CustomerContext access token (Authorization Code, cart.basic:write).
 *
 * @param ingredients   List of missing ingredients with optional krogerUpc hints.
 * @param userAccessToken  CustomerContext Bearer token for PUT /v1/cart/add.
 */
async function createCartWithItems(
  ingredients: MissingIngredient[],
  userAccessToken?: string
): Promise<CartResult> {
  // ClientContext token for product search (product.compact only)
  const clientToken = await krogerAuth.getClientCredentialsToken();
  const unmatchedIngredients: string[] = [];

  const resolvedItems: Array<{ upc: string; quantity: number; modality: 'PICKUP' | 'DELIVERY' }> = [];
  for (const ing of ingredients) {
    try {
      let upc = ing.krogerUpc;
      if (!upc) {
        const found = await searchProductUpc(clientToken, ing.name);
        upc = found ?? undefined;
      }
      if (upc) {
        resolvedItems.push({
          upc,
          quantity: Math.max(1, Math.ceil(ing.quantity)),
          modality: 'PICKUP',
        });
      } else {
        unmatchedIngredients.push(ing.name);
      }
    } catch {
      unmatchedIngredients.push(ing.name);
    }
  }

  if (resolvedItems.length === 0) {
    return { cartId: '', unmatchedIngredients };
  }

  if (!userAccessToken) {
    throw new Error('A CustomerContext access token (cart.basic:write) is required to add items to cart.');
  }

  // CustomerContext: PUT /v1/cart/add (cart.basic:write)
  const response = await axios.put(
    `${KROGER_API}/cart/add`,
    { items: resolvedItems },
    {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const cartId: string = response.data?.id || response.data?.cartId || `cart-${Date.now()}`;
  return { cartId, unmatchedIngredients };
}

export const krogerService = {
  createCartWithItems,
  getAccessToken: () => krogerAuth.getClientCredentialsToken(),
};
