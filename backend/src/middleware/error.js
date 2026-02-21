export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message ?? 'Internal server error';
  res.status(status).json({ error: message });
}

export function badRequest(msg) {
  const e = new Error(msg ?? 'Bad request');
  e.status = 400;
  return e;
}

export function unauthorized(msg) {
  const e = new Error(msg ?? 'Unauthorized');
  e.status = 401;
  return e;
}

export function forbidden(msg) {
  const e = new Error(msg ?? 'Forbidden');
  e.status = 403;
  return e;
}

export function notFound(msg) {
  const e = new Error(msg ?? 'Not found');
  e.status = 404;
  return e;
}
