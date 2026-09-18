export const nextOrderNumber = (
  numbers: string[],
  padStart = 4,
): string => {
  const maxNumber = numbers.reduce((max, number) => {
    const match = number.match(/(\d+)$/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);

  return `ORD-${String(maxNumber + 1).padStart(padStart, '0')}`;
};

export const nextInvoiceNumber = (numbers: string[]): string => {
  const maxNumber = numbers.reduce((max, number) => {
    const value = Number(number.replace(/\D/g, ''));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 1000);

  return `INV-${maxNumber + 1}`;
};

export const nextDeliveryNumber = (
  numbers: string[],
  offset = 0,
  padStart = 4,
): string => {
  const maxNumber = numbers.reduce((max, number) => {
    const match = number.match(/(\d+)$/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);

  return `DLV-${String(maxNumber + 1 + offset).padStart(padStart, '0')}`;
};

export const nextRouteNumber = (numbers: string[]): string => {
  const maxNumber = numbers.reduce((max, number) => {
    const match = number.match(/(\d+)$/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 1000);

  return `RT-${maxNumber + 1}`;
};
