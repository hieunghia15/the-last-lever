/** Thrown when an action breaks the rules. Callers only send actions from legalActions, so this is a bug. */
export class IllegalActionError extends Error {
  override name = 'IllegalActionError';
}
