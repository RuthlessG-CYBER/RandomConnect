// Generate a random 10-digit virtual number in format XXX-XXX-XXXX
export const generateVirtualNumber = (): string => {
  const prefix = Math.floor(Math.random() * 900) + 100; // 100-999
  const middle = Math.floor(Math.random() * 900) + 100; // 100-999
  const suffix = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  return `${prefix}-${middle}-${suffix}`;
};

// Generate a pool of numbers
export const generateNumberPool = (count: number): string[] => {
  const pool = new Set<string>();
  while (pool.size < count) {
    pool.add(generateVirtualNumber());
  }
  return Array.from(pool);
};
