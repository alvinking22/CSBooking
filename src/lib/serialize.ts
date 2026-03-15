/**
 * Converts Prisma Decimal fields (and Date objects) to plain JS primitives
 * so objects are safe to pass from Server Components / Server Actions to Client Components.
 */
export function serializePrisma<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      // Prisma Decimal instances come from Decimal.js and have constructor name "Decimal"
      if (
        value !== null &&
        typeof value === "object" &&
        value.constructor?.name === "Decimal"
      ) {
        return Number(value.toString());
      }
      return value;
    })
  );
}
