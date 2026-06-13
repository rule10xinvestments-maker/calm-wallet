import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTransactionTitleForDisplay(title: string) {
  if (title !== title.toLocaleLowerCase()) {
    return title;
  }

  const firstVisibleCharacterIndex = title.search(/\S/u);

  if (firstVisibleCharacterIndex === -1) {
    return title;
  }

  return `${title.slice(0, firstVisibleCharacterIndex)}${title.charAt(firstVisibleCharacterIndex).toLocaleUpperCase()}${title.slice(
    firstVisibleCharacterIndex + 1,
  )}`;
}
