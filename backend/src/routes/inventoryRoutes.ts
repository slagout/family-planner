import { Router } from 'express';
import express from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  importInventoryCSV,
  exportInventoryCSV,
  lookupBarcode,
} from '../handlers/inventoryHandler';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

// Barcode lookup (shared across sections)
inventoryRouter.get('/barcode/:upc', lookupBarcode);

// Section-scoped routes — :section is pantry|freezer|refrigerator|bulk
inventoryRouter.get('/:section/export',  exportInventoryCSV);
inventoryRouter.get('/:section/:id',     getInventoryItem);
inventoryRouter.get('/:section',         listInventory);
inventoryRouter.post('/:section/import', express.json({ limit: '500kb' }), importInventoryCSV);
inventoryRouter.post('/:section',        createInventoryItem);
inventoryRouter.put('/:section/:id',     updateInventoryItem);
inventoryRouter.delete('/:section/:id',  deleteInventoryItem);
