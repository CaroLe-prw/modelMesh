export function mergeModelOptions(...groups: readonly (readonly string[])[]): string[] {
  return [...new Set(groups.flat())].sort((left, right) => left.localeCompare(right));
}
