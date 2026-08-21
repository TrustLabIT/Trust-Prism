// A tiny navigation guard. A page (e.g. Settings) registers a guard function
// that returns a Promise<boolean>: true = OK to leave, false = stay put.
// Navigation entry points (the Sidebar) call canLeave() before navigating.
let guardFn = null;

export function setNavGuard(fn) { guardFn = fn; }
export function clearNavGuard(fn) { if (guardFn === fn) guardFn = null; }

export async function canLeave() {
  if (!guardFn) return true;
  try { return await guardFn(); }
  catch { return true; } // never trap the user if the guard itself errors
}
