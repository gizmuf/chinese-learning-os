export const workspaceExploreEvent = 'chinese-os:atlas-workspace-explore';

export function workspaceOrigin(element: HTMLElement | null) {
  return element?.closest<HTMLElement>('[data-atlas-workspace]') ?? null;
}
