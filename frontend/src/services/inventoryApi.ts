import client from '../api/client';

export type Section = 'pantry' | 'freezer' | 'refrigerator' | 'bulk';

export interface InventoryItem {
  id: number;
  name?: string;
  batch_name?: string;
  upc?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  expiration_date?: string;
  notes?: string;
  kroger_item_id?: string;
  // pantry extras
  location?: string;
  low_qty_threshold?: number;
  // freezer extras
  freezer_bin?: string;
  sous_vide_ready?: boolean;
  // fridge extras
  shelf?: string;
  temperature_zone?: string;
  is_dairy_free?: boolean;
  // bulk extras
  recipe_name?: string;
  portions?: number;
  storage_location?: string;
  reheat_instructions?: string;
  meal_plan_date?: string;
  prep_date?: string;
  freeze_date?: string;
  updated_at?: string;
  created_at?: string;
}

export interface BarcodeResult {
  upc: string;
  name: string;
  brand?: string;
  category?: string;
  kroger_item_id?: string;
  size?: string;
}

export async function listItems(section: Section, params?: Record<string, string>): Promise<InventoryItem[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const { data } = await client.get<InventoryItem[]>(`/inventory/${section}${qs}`);
  return data;
}

export async function getItem(section: Section, id: number): Promise<InventoryItem> {
  const { data } = await client.get<InventoryItem>(`/inventory/${section}/${id}`);
  return data;
}

export async function createItem(section: Section, item: Partial<InventoryItem>): Promise<InventoryItem> {
  const { data } = await client.post<InventoryItem>(`/inventory/${section}`, item);
  return data;
}

export async function updateItem(section: Section, id: number, patch: Partial<InventoryItem>): Promise<InventoryItem> {
  const { data } = await client.put<InventoryItem>(`/inventory/${section}/${id}`, patch);
  return data;
}

export async function deleteItem(section: Section, id: number): Promise<void> {
  await client.delete(`/inventory/${section}/${id}`);
}

export async function importCSV(section: Section, rows: Record<string, string>[]): Promise<{ inserted: number; errors: string[] }> {
  const { data } = await client.post(`/inventory/${section}/import`, { rows });
  return data;
}

export async function exportCSV(section: Section): Promise<string> {
  const { data } = await client.get<string>(`/inventory/${section}/export`, {
    responseType: 'text',
  });
  return data;
}

export async function lookupBarcode(upc: string): Promise<BarcodeResult> {
  const { data } = await client.get<BarcodeResult>(`/inventory/barcode/${upc}`);
  return data;
}
