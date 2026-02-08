/**
 * Grid layout calculation utility
 * Calculates optimal tile sizes for video call grids
 *
 * Extracted from lib/utils.tsx
 */

export interface GridLayoutResult {
  width: number;
  height: number;
  cols: number;
}

/**
 * Calculate optimal grid layout for video call tiles
 *
 * @param count - Number of tiles to display
 * @param containerWidth - Available container width in pixels
 * @param containerHeight - Available container height in pixels
 * @param gap - Gap between tiles in pixels (default: 16)
 * @param aspectRatio - Tile aspect ratio (default: 16/9)
 * @returns Optimal tile dimensions and column count
 */
export function calculateGridLayout(
  count: number,
  containerWidth: number,
  containerHeight: number,
  gap: number = 16,
  aspectRatio: number = 16 / 9,
): GridLayoutResult {
  if (count === 0) return { width: 0, height: 0, cols: 0 };

  let bestWidth = 0;
  let bestHeight = 0;
  let bestCols = 1;

  // Try all possible column counts
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);

    // Calculate max width based on column constraints
    const maxW = (containerWidth - (cols - 1) * gap) / cols;

    // Calculate max height based on row constraints
    const maxH = (containerHeight - (rows - 1) * gap) / rows;

    if (maxW <= 0 || maxH <= 0) continue;

    // Determine dimensions based on aspect ratio
    let w = maxW;
    let h = w / aspectRatio;

    // Check if height fits, if not, scale down
    if (h > maxH) {
      h = maxH;
      w = h * aspectRatio;
    }

    // Maximize area
    if (w > bestWidth) {
      bestWidth = w;
      bestHeight = h;
      bestCols = cols;
    }
  }

  return { width: bestWidth, height: bestHeight, cols: bestCols };
}

/**
 * Calculate number of rows for a given column count
 */
export function calculateRows(count: number, cols: number): number {
  return Math.ceil(count / cols);
}

/**
 * Get responsive gap size based on container dimensions
 */
export function getResponsiveGap(containerWidth: number): number {
  if (containerWidth < 600) return 8;
  if (containerWidth < 1200) return 12;
  return 16;
}
