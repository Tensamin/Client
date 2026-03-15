/**
 * Executes reduceDisplay.
 * @param display Parameter display.
 * @returns unknown.
 */
export function reduceDisplay(display: string) {
  const words = display.split(" ");
  if (words.length === 1) {
    return display.slice(0, 2).toUpperCase();
  } else {
    return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
  }
}
