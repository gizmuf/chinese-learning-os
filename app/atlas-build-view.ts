export const buildLayouts = ['grid', 'list', 'positions'] as const;
export const assemblyPositions = [
  'left', 'right', 'top', 'bottom', 'upper left', 'upper right', 'lower left', 'lower right',
  'middle', 'around', 'inside', 'overlapping',
] as const;

export type Position = typeof assemblyPositions[number];
export type BuildDisplay = {
  layout: typeof buildLayouts[number];
  position: Position | 'all';
  form: string;
  nested: boolean;
  directory: boolean;
  highlight: boolean;
};

export const defaultBuildDisplay: BuildDisplay = {
  layout: 'grid', position: 'all', form: '', nested: false, directory: false, highlight: true,
};
