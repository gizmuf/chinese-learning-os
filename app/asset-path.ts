// Production serves assets at the origin root; static demos can use a subfolder.
let base = "/";
export function setAssetBase(value: string) {
  base = value.endsWith("/") ? value : `${value}/`;
}
export function assetPath(path: string) {
  return base + path.replace(/^\//, "");
}
