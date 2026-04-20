// Node.js is single-threaded, so this in-memory counter is safe for a
// standalone server process. It resets on server restart.
let visitCount = 0;

export function incrementVisits(): number {
  visitCount += 1;
  return visitCount;
}

export function getVisits(): number {
  return visitCount;
}
