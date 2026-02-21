import { validationResult } from 'express-validator';
import { badRequest } from './error.js';

/**
 * Middleware that runs after validators. If there are errors, returns 400 with first error message.
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array({ onlyFirstError: true })[0];
    const message = first?.msg || 'Validation failed';
    return next(badRequest(message));
  }
  next();
}
