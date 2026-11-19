function calculateSalePrice(basePrice) {
  if (basePrice === null) {
    return null;
  }

  if (!Number.isSafeInteger(basePrice) || basePrice < 0) {
    throw new RangeError("Base price must be a non-negative safe integer.");
  }

  const salePrice = (BigInt(basePrice) * 119n + 50n) / 100n;

  if (salePrice > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Calculated sale price exceeds the safe integer range.");
  }

  return Number(salePrice);
}

module.exports = { calculateSalePrice };
