// UN blue (Pantone 279C) theme, scoped to the 3W Humanitarian Mapping
// dashboard only — the rest of the site keeps its coffee-brown theme.
export const unBlue = {
  light: '#EAF2FC',
  DEFAULT: '#5B92E5',
  dark: '#1B4F91',
};

export const unChoroplethRamp = ['#E3ECF7', '#AFCBF0', '#5B92E5', '#1B4F91']; // none / low / medium / high

export const unCategorical = [
  '#1B4F91',
  '#5B92E5',
  '#8FB8ED',
  '#2E7D9E',
  '#00A9B5',
  '#4A6FA5',
  '#7EA8E0',
  '#3D5A80',
];

// Red Cross keeps its real-world red — an actual organizational color
// identity, not a decorative choice to override.
export const unOrgTypeColors: Record<string, string> = {
  INGO: '#1B4F91',
  NNGO: '#5B92E5',
  'UN Agency': '#00A9B5',
  'Red Cross': '#C62828',
};
