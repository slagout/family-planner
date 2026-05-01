import axios from 'axios';
import { MissingIngredient } from '../types';

interface KrogerToken {
  accessToken: string;
  expiresAt: number;
}

interface CartResult {
  cartId: string;
  unmatchedIngredients: string[];
}

let cachedToken: KrogerToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }
  const clientId = process.env.KROGER_CLIENT_ID!;
  const clientSecret = process.env.KROGER_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await axios.post(
    'https://api.kroger.com/v1/connect/oauth2/token',
    'grant_type=client_credentials&scope=cart.basic:write product.compact',
    { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  cachedToken = {
    accessToken: response.data.access_token,
    expiresAt: Date.now() + response.data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

async function searchProduct(accessToken: string, term: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(term)}&filter.limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const product = response.data?.data?.[0];
    return product?.items?.[0]?.itemId || product?.productId || null;
  } catch {
    return null;
  }
}

async function createCartWithItems(ingredients: MissingIngredient[]): Promise<CartResult> {
  const accessToken = await getAccessToken();
  const unmatchedIngredients: string[] = [];

  // Resolve UPCs for all ingredients
  const resolvedItems: Array<{ upc: string; quantity: number }> = [];
  for (const ing of ingredients) {
    try {
      let upc = ing.krogerUpc;
      if (!upc) {
        const found = await searchProduct(accessToken, ing.name);
        upc = found ?? undefined;
      }
      if (upc) {
        resolvedItems.push({ upc, quantity: Math.max(1, Math.ceil(ing.quantity)) });
      } else {
        unmatchedIngredients.push(ing.name);
      }
    } catch {
      unmatchedIngredients.push(ing.name);
    }
  }

  // Add items to cart (PUT creates/updates the cart)
  const response = await axios.put(
    'https://api.kroger.com/v1/cart/add',
    { items: resolvedItems },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );

  const cartId: string = response.data?.id || response.data?.cartId || `cart-${Date.now()}`;
  return { cartId, unmatchedIngredients };
}

export const krogerService = { createCartWithItems, getAccessToken };
