let listeners: Array<() => void> = [];
export function emit() { listeners.forEach(l => l()); }
export function subscribeToFocoData(listener: () => void) {
  listeners.push(listener);
  return () => { listeners = listeners.filter(x => x !== listener); };
}