/**
 * Maps the negative `output` codes returned by the seagull savedashboard
 * endpoint to HTTP status codes for our own route handlers.
 *
 *   -1 → 500  generic save error
 *   -2 → 409  duplicate dashboard name
 *   -3 → 402  license limit exceeded
 *   -4 → 403  permission denied
 */
export const SAVE_ERROR_HTTP: Record<number, number> = {
  [-1]: 500,
  [-2]: 409,
  [-3]: 402,
  [-4]: 403,
};
