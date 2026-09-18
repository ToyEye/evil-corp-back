import {
  DeliveryStatus,
  FailureReason,
  InventoryCategory,
} from '@prisma/client';

/** Frontend Zod string values for delivery status. */
export type ApiDeliveryStatus =
  | 'New'
  | 'Planned'
  | 'In transit'
  | 'Arrived'
  | 'Failed'
  | 'Canceled'
  | 'Done';

export type ApiFailureReason =
  | 'Customer absent'
  | 'Refused'
  | 'Wrong address'
  | 'Damaged goods'
  | 'Could not access site'
  | 'Other';

export type ApiInventoryCategory =
  | 'Packaging'
  | 'Spare parts'
  | 'Consumables'
  | 'Equipment'
  | 'Safety';

const DELIVERY_STATUS_TO_API: Record<DeliveryStatus, ApiDeliveryStatus> = {
  [DeliveryStatus.New]: 'New',
  [DeliveryStatus.Planned]: 'Planned',
  [DeliveryStatus.InTransit]: 'In transit',
  [DeliveryStatus.Arrived]: 'Arrived',
  [DeliveryStatus.Failed]: 'Failed',
  [DeliveryStatus.Canceled]: 'Canceled',
  [DeliveryStatus.Done]: 'Done',
};

const DELIVERY_STATUS_FROM_API: Record<ApiDeliveryStatus, DeliveryStatus> = {
  New: DeliveryStatus.New,
  Planned: DeliveryStatus.Planned,
  'In transit': DeliveryStatus.InTransit,
  Arrived: DeliveryStatus.Arrived,
  Failed: DeliveryStatus.Failed,
  Canceled: DeliveryStatus.Canceled,
  Done: DeliveryStatus.Done,
};

const FAILURE_REASON_TO_API: Record<FailureReason, ApiFailureReason> = {
  [FailureReason.CustomerAbsent]: 'Customer absent',
  [FailureReason.Refused]: 'Refused',
  [FailureReason.WrongAddress]: 'Wrong address',
  [FailureReason.DamagedGoods]: 'Damaged goods',
  [FailureReason.CouldNotAccessSite]: 'Could not access site',
  [FailureReason.Other]: 'Other',
};

const FAILURE_REASON_FROM_API: Record<ApiFailureReason, FailureReason> = {
  'Customer absent': FailureReason.CustomerAbsent,
  Refused: FailureReason.Refused,
  'Wrong address': FailureReason.WrongAddress,
  'Damaged goods': FailureReason.DamagedGoods,
  'Could not access site': FailureReason.CouldNotAccessSite,
  Other: FailureReason.Other,
};

const CATEGORY_TO_API: Record<InventoryCategory, ApiInventoryCategory> = {
  [InventoryCategory.Packaging]: 'Packaging',
  [InventoryCategory.SpareParts]: 'Spare parts',
  [InventoryCategory.Consumables]: 'Consumables',
  [InventoryCategory.Equipment]: 'Equipment',
  [InventoryCategory.Safety]: 'Safety',
};

const CATEGORY_FROM_API: Record<ApiInventoryCategory, InventoryCategory> = {
  Packaging: InventoryCategory.Packaging,
  'Spare parts': InventoryCategory.SpareParts,
  Consumables: InventoryCategory.Consumables,
  Equipment: InventoryCategory.Equipment,
  Safety: InventoryCategory.Safety,
};

export const toApiDeliveryStatus = (status: DeliveryStatus): ApiDeliveryStatus =>
  DELIVERY_STATUS_TO_API[status];

export const fromApiDeliveryStatus = (
  status: ApiDeliveryStatus,
): DeliveryStatus => DELIVERY_STATUS_FROM_API[status];

export const toApiFailureReason = (
  reason: FailureReason,
): ApiFailureReason => FAILURE_REASON_TO_API[reason];

export const fromApiFailureReason = (
  reason: ApiFailureReason,
): FailureReason => FAILURE_REASON_FROM_API[reason];

export const toApiInventoryCategory = (
  category: InventoryCategory,
): ApiInventoryCategory => CATEGORY_TO_API[category];

export const fromApiInventoryCategory = (
  category: ApiInventoryCategory,
): InventoryCategory => CATEGORY_FROM_API[category];

export const TERMINAL_DELIVERY_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.Canceled,
  DeliveryStatus.Done,
  DeliveryStatus.Failed,
];

export const isDeliveryTerminal = (status: DeliveryStatus): boolean =>
  TERMINAL_DELIVERY_STATUSES.includes(status);

export const canEditDeliveryAssignment = (status: DeliveryStatus): boolean =>
  status === DeliveryStatus.New || status === DeliveryStatus.Planned;

export const getDeliveryStatusFromSchedule = (
  dispatchAt?: string | Date | null,
  deliverBy?: string | Date | null,
): DeliveryStatus =>
  dispatchAt || deliverBy ? DeliveryStatus.Planned : DeliveryStatus.New;
