import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Executes cn.
 * @param inputs Parameter inputs.
 * @returns unknown.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
