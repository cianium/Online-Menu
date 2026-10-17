/** Small helpers shared by routes. No dependencies. */
export function httpError(status, message, code = 'REQUEST_ERROR') {
  const error = new Error(message);
  error.statusCode = status;
  error.apiCode = code;
  return error;
}
