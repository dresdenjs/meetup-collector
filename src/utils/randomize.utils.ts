export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function pickNumber(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min));
}
