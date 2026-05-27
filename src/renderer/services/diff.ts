function splitLines(content: string): string[] {
  if (!content) return [];
  return content.replace(/\r\n/g, '\n').split('\n');
}

export function createUnifiedDiff(relativePath: string, oldContent: string, newContent: string): string {
  const oldLines = splitLines(oldContent);
  const newLines = splitLines(newContent);
  const lcs: number[][] = Array.from({ length: oldLines.length + 1 }, () => Array(newLines.length + 1).fill(0));

  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      lcs[oldIndex][newIndex] =
        oldLines[oldIndex] === newLines[newIndex]
          ? lcs[oldIndex + 1][newIndex + 1] + 1
          : Math.max(lcs[oldIndex + 1][newIndex], lcs[oldIndex][newIndex + 1]);
    }
  }

  const lines = [`--- ${relativePath}`, `+++ ${relativePath}`, '@@'];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex < oldLines.length && newIndex < newLines.length && oldLines[oldIndex] === newLines[newIndex]) {
      lines.push(` ${oldLines[oldIndex]}`);
      oldIndex += 1;
      newIndex += 1;
    } else if (newIndex < newLines.length && (oldIndex === oldLines.length || lcs[oldIndex][newIndex + 1] >= lcs[oldIndex + 1][newIndex])) {
      lines.push(`+${newLines[newIndex]}`);
      newIndex += 1;
    } else if (oldIndex < oldLines.length) {
      lines.push(`-${oldLines[oldIndex]}`);
      oldIndex += 1;
    }
  }

  return lines.join('\n');
}
