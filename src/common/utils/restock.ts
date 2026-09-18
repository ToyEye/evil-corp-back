import { RestockStatus } from '@prisma/client';

export const getNextRestockStatus = (
  status: RestockStatus,
): RestockStatus | undefined => {
  if (status === RestockStatus.New) {
    return RestockStatus.Confirmed;
  }

  if (status === RestockStatus.Confirmed) {
    return RestockStatus.Delivered;
  }

  if (status === RestockStatus.Delivered) {
    return RestockStatus.Received;
  }

  return undefined;
};

export const canSupplyAdvanceRestock = (status: RestockStatus): boolean =>
  status === RestockStatus.New || status === RestockStatus.Confirmed;

export const canReceiveRestock = (status: RestockStatus): boolean =>
  status === RestockStatus.Delivered;
