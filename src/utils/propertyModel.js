export function ensureOptimizationFields(property) {
  const rent = Number(property?.rent ?? property?.price ?? 0);
  const commuteTime = Number(property?.commuteTime ?? 25);
  const lifestyle = property?.lifestyle || {};
  const lifestyleVector =
    Array.isArray(property?.lifestyleVector) && property.lifestyleVector.length === 5
      ? property.lifestyleVector
      : [
          Number(lifestyle.sleep ?? 3),
          Number(lifestyle.cleanliness ?? 3),
          Number(lifestyle.social ?? 3),
          Number(lifestyle.study ?? 3),
          Number(lifestyle.noise ?? 3)
        ];

  return {
    ...property,
    rent,
    price: Number(property?.price ?? rent),
    commuteTime,
    lifestyleVector,
    currency: 'GBP',
    countryCode: 'GB'
  };
}

export function toUkAddress(address) {
  if (!address) return '';
  return /uk|united kingdom/i.test(address) ? address : `${address}, UK`;
}
