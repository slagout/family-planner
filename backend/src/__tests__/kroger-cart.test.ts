import { krogerCart } from '../integrations/kroger/kroger-cart';

describe('krogerCart.getMissingIngredients', () => {
  it('returns all ingredients when pantry is empty', async () => {
    const ingredients = [
      { name: 'milk', quantity: 2, unit: 'cups' },
      { name: 'eggs', quantity: 3 },
    ];
    const result = await krogerCart.getMissingIngredients(ingredients, []);
    expect(result).toHaveLength(2);
  });

  it('excludes ingredients already in pantry with sufficient quantity', async () => {
    const ingredients = [
      { name: 'milk', quantity: 1, unit: 'cup' },
      { name: 'eggs', quantity: 2 },
    ];
    const pantry = [
      { name: 'milk', quantity: 2, unit: 'cups' },
      { name: 'eggs', quantity: 12 },
    ];
    const result = await krogerCart.getMissingIngredients(ingredients, pantry);
    expect(result).toHaveLength(0);
  });

  it('includes ingredients where pantry quantity is insufficient', async () => {
    const ingredients = [{ name: 'flour', quantity: 5, unit: 'cups' }];
    const pantry = [{ name: 'flour', quantity: 2, unit: 'cups' }];
    const result = await krogerCart.getMissingIngredients(ingredients, pantry);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('flour');
  });
});
