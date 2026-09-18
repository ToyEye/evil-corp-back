import { InventoryCategory, WarehouseZone } from '@prisma/client';

export const STOCK_CRITICAL_QTY = 20;
export const STOCK_LOW_QTY = 50;

export type StockLevel = 'critical' | 'low' | 'ok';

export const getStockLevel = (quantity: number): StockLevel => {
  if (quantity < STOCK_CRITICAL_QTY) {
    return 'critical';
  }

  if (quantity < STOCK_LOW_QTY) {
    return 'low';
  }

  return 'ok';
};

export const ZONE_BY_CATEGORY: Record<InventoryCategory, WarehouseZone> = {
  [InventoryCategory.Packaging]: WarehouseZone.Bulk,
  [InventoryCategory.SpareParts]: WarehouseZone.Pick,
  [InventoryCategory.Consumables]: WarehouseZone.Chill,
  [InventoryCategory.Equipment]: WarehouseZone.Dock,
  [InventoryCategory.Safety]: WarehouseZone.Safety,
};
