export const hanziStyles=['print','book','strokes'] as const;
export type HanziStyle=typeof hanziStyles[number];

export function isHanziStyle(value:unknown):value is HanziStyle {
 return hanziStyles.some(style=>style===value);
}
