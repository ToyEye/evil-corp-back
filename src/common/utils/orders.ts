import type { FulfillmentStatus } from '@prisma/client';

type LineStock = {
  quantity: number;
  reservedQuantity: number;
  pickedQuantity: number;
};

export const isOrderFullyReserved = (items: LineStock[]): boolean =>
  items.every((item) => item.reservedQuantity >= item.quantity);

export const isOrderFullyPicked = (items: LineStock[]): boolean =>
  items.every((item) => item.pickedQuantity >= item.quantity);

export const nextFulfillmentFromStock = (
  fulfillmentStatus: FulfillmentStatus,
  items: LineStock[],
): FulfillmentStatus => {
  if (!isOrderFullyReserved(items)) {
    return fulfillmentStatus === 'Picking' || fulfillmentStatus === 'Ready'
      ? fulfillmentStatus
      : 'Waiting';
  }

  if (fulfillmentStatus === 'Waiting') {
    return 'Reserved';
  }

  return fulfillmentStatus;
};

export const getOrderTotal = (
  items: { quantity: number; unitPrice: number }[],
): number =>
  items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
