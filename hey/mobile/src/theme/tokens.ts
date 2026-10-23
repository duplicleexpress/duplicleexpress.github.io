export const palette = {
  light: {
    background: "#F6F6F8",
    surface: "#FFFFFF",
    surfaceAlt: "#EEEEF2",
    text: "#0B0B0F",
    textSecondary: "#6B6B76",
    border: "#E2E2E8",
    accent: "#5B5BF6",
    accentSoft: "#E7E7FE",
    accentText: "#FFFFFF",
    danger: "#E5484D",
    success: "#2FB36B",
    warning: "#E8A317",
    bubbleUser: "#5B5BF6",
    bubbleUserText: "#FFFFFF",
    bubbleAi: "#FFFFFF",
    bubbleAiText: "#0B0B0F",
  },
  dark: {
    background: "#09090C",
    surface: "#16161B",
    surfaceAlt: "#202027",
    text: "#F4F4F7",
    textSecondary: "#9A9AA6",
    border: "#2A2A32",
    accent: "#7C7CFF",
    accentSoft: "#23234A",
    accentText: "#FFFFFF",
    danger: "#FF6369",
    success: "#3DD68C",
    warning: "#F5B83D",
    bubbleUser: "#6E6EFA",
    bubbleUserText: "#FFFFFF",
    bubbleAi: "#1C1C22",
    bubbleAiText: "#F4F4F7",
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: string };

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const type = {
  hero: { fontSize: 56, fontWeight: "800" as const, letterSpacing: 2 },
  title: { fontSize: 28, fontWeight: "700" as const },
  heading: { fontSize: 20, fontWeight: "600" as const },
  body: { fontSize: 17, fontWeight: "400" as const },
  label: { fontSize: 15, fontWeight: "500" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
};
