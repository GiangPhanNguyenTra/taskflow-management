export const themes = {
  "pink-pastel": { name: "Pink Pastel", description: "Soft, sweet & calming" },
  "original-purple": {
    name: "Original Purple",
    description: "Creative, bold & inspiring",
  },
  "sky-blue": { name: "Sky Blue", description: "Fresh, clear & focused" },
  "sage-green": { name: "Sage Green", description: "Natural, calm & balanced" },
} as const;

export type ThemeId = keyof typeof themes;
export const defaultTheme: ThemeId = "pink-pastel";

export function isThemeId(value: string): value is ThemeId {
  return value in themes;
}

export function applyTheme(theme: string | undefined) {
  document.documentElement.dataset.theme = isThemeId(theme ?? "")
    ? theme
    : defaultTheme;
}
