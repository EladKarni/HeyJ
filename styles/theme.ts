/**
 * Shared theme constants for the HeyJ app
 * Color palette: Seashell, Azure Mist, Almond Silk, Sweet Salmon, Burnt Peach
 */

// Color palette definitions
const seashell = "#FEF1E8";
const azureMist = "#D8E7E6";
const almondSilk = "#F7C8B8";
const sweetSalmon = "#EB9B88";
const burntPeach = "#F27A58";

// Dark mode variants (darker versions for backgrounds)
const darkBackground = "#1a1410"; // Very dark warm brown
const darkSecondary = "#2a1f18"; // Dark warm brown
const darkTertiary = "#3a2a20"; // Medium dark warm brown

// Dark mode text colors (lighter versions from palette)
const darkText = seashell; // "#FEF1E8"
const darkTextSecondary = almondSilk; // "#F7C8B8"
const darkTextTertiary = sweetSalmon; // "#EB9B88"

export const colors = {
  // Primary colors - using burnt peach as primary accent
  primary: burntPeach, // "#F27A58"
  primaryLight: sweetSalmon, // "#EB9B88"
  primaryDark: "#C85A3A", // Darker burnt peach
  primaryDisabled: "#8B4A35", // Even darker for disabled state
  
  // Background colors - using dark warm tones for dark mode
  background: darkBackground, // "#1a1410" - very dark warm brown
  backgroundSecondary: darkSecondary, // "#2a1f18" - dark warm brown
  backgroundTertiary: darkTertiary, // "#3a2a20" - medium dark warm brown
  
  // Text colors - using light palette colors for dark mode
  text: darkText, // "#FEF1E8" - seashell (lightest)
  textSecondary: darkTextSecondary, // "#F7C8B8" - almond silk
  textTertiary: darkTextTertiary, // "#EB9B88" - sweet salmon
  
  // Border colors - using medium tones from palette
  border: "#5a4a40", // Medium dark warm brown
  borderLight: "#4a3a30", // Darker warm brown
  borderDark: sweetSalmon, // "#EB9B88" - sweet salmon for emphasis
  
  // Accent colors - using palette colors
  link: azureMist, // "#D8E7E6" - azure mist for links
  success: "#4A9BA8", // Darker azure mist for better contrast on dark backgrounds
  error: burntPeach, // "#F27A58" - burnt peach for errors
  warning: sweetSalmon, // "#EB9B88" - sweet salmon for warnings
  info: azureMist, // "#D8E7E6" - azure mist for info
  
  // Neutral colors - adapted for dark mode
  white: seashell, // "#FEF1E8" - seashell for light elements
  black: darkBackground, // "#1a1410" - darkest for backgrounds
  gray: "#6a5a50", // Medium warm gray
  lightGray: almondSilk, // "#F7C8B8" - almond silk
  darkGray: "#4a3a30", // Dark warm gray
  
  // Additional accent colors
  accent: burntPeach, // "#F27A58" - burnt peach
  accentLight: sweetSalmon, // "#EB9B88" - sweet salmon
  accentDark: "#C85A3A", // Darker burnt peach
  
  // Legacy color mappings for compatibility
  yellow: almondSilk, // "#F7C8B8" - almond silk
  lightBlue: azureMist, // "#D8E7E6" - azure mist
  blueBorder: azureMist, // "#D8E7E6" - azure mist
  red: burntPeach, // "#F27A58" - burnt peach
  redDark: "#C85A3A", // Darker burnt peach
  redDarker: "#8B4A35", // Even darker burnt peach
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 15,
  lg: 20,
  xl: 30,
  xxl: 40,
};

export const typography = {
  title: {
    fontSize: 32,
    fontWeight: "bold" as const,
  },
  subtitle: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
  },
  bodySmall: {
    fontSize: 14,
  },
  caption: {
    fontSize: 12,
  },
};

export const borderRadius = {
  sm: 8,
  md: 10,
  lg: 25,
  xl: 60,
  full: 9999,
};

export const buttonHeight = 50;

