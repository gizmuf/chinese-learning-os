import {isAssemblyGlyph} from './atlas-assembly-model';
import {wordFrames, type SwipeDirection, type SwipeFrame} from './atlas-swipe-model';
import type {BrowseScope} from './hsk-scope';

export function otherWordHanzi(text: string, anchor: string) {
  return Array.from(new Set(text)).filter(glyph => glyph !== anchor && isAssemblyGlyph(glyph));
}

export function wordBranches(candidate: SwipeFrame, shared: string, scope: BrowseScope) {
  if (!candidate.text.includes(shared)) return [];
  return otherWordHanzi(candidate.text, shared).map(anchor => ({
    anchor,
    words: wordFrames('en', scope, anchor, false).filter(word => word.text !== candidate.text),
  }));
}

export type WordCross = ReturnType<typeof wordCross>;
export function wordCross(current: SwipeFrame, scope: BrowseScope, retainedVertical?: string) {
  const vertical = retainedVertical && current.text.includes(retainedVertical) ? retainedVertical
    : otherWordHanzi(current.text, current.anchor)[0];
  const horizontal = current.anchor === vertical ? undefined : current.anchor;
  const neighbours: Record<SwipeDirection, SwipeFrame[]> = {left: [], right: [], up: [], down: []};

  function collect(anchor: string | undefined, previous: SwipeDirection, next: SwipeDirection) {
    if (!anchor) return;
    const words = wordFrames('en', scope, anchor, false);
    const index = words.findIndex(word => word.text === current.text);
    if (index < 0) return;
    neighbours[previous] = [...words.slice(0, index).reverse(), ...words.slice(index + 1).reverse()];
    neighbours[next] = [...words.slice(index + 1), ...words.slice(0, index)];
  }
  collect(horizontal, 'left', 'right');
  collect(vertical, 'up', 'down');

  // A word that uses both hanzi can occupy either axis. Assign constrained
  // directions first and move a shared word if another direction needs it.
  const directions = (Object.keys(neighbours) as SwipeDirection[]).sort((a, b) => neighbours[a].length - neighbours[b].length);
  const placed = new Map<string, SwipeDirection>();
  const peers: Record<SwipeDirection, SwipeFrame[]> = {left: [], right: [], up: [], down: []};
  for (let distance = 0; distance < 2; distance++) {
    for (const direction of directions) {
      const word = neighbours[direction][distance];
      if (!word || placed.has(word.text)) continue;
      placed.set(word.text, direction);
      peers[direction].push(word);
    }
  }
  function place(direction: SwipeDirection, visited = new Set<string>()): boolean {
    const available = neighbours[direction].filter(word => placed.get(word.text) !== direction);
    const ordered = [...available.filter(word => !placed.has(word.text)), ...available.filter(word => placed.has(word.text))];
    for (const word of ordered) {
      if (visited.has(word.text)) continue;
      const occupied = placed.get(word.text);
      visited.add(word.text);
      if (occupied && !place(occupied, visited)) continue;
      if (occupied) peers[occupied] = peers[occupied].filter(frame => frame.text !== word.text);
      peers[direction].push(word);
      placed.set(word.text, direction);
      return true;
    }
    return false;
  }
  for (const direction of directions) {
    while (peers[direction].length < 2 && place(direction)) { /* fill the remaining slots */ }
  }
  for (const direction of directions) {
    const ordered = new Set(peers[direction]);
    peers[direction] = neighbours[direction].filter(word => ordered.has(word));
  }
  return {horizontal, vertical, peers};
}
