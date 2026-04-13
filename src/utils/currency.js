function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizePropertyCurrency(property) {
  if (!property || typeof property !== 'object') return property;

  const price = toNumber(property.price);
  const rent = toNumber(property.rent);

  return {
    ...property,
    price: price !== null ? Math.max(0, Math.round(price)) : property.price,
    rent: rent !== null ? Math.max(0, Math.round(rent)) : property.rent,
    currency: 'GBP',
    countryCode: 'GB'
  };
}
