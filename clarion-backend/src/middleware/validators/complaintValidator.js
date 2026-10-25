const { body } = require('express-validator');

/**
 * Validates POST /api/complaints body.
 * - customerId: required, safe format (alphanumeric/underscore/hyphen), bounded length
 * - complaintText: required, meaningful length, capped to prevent prompt-injection
 *   padding / abuse of the Gemini API (cost + latency DoS vector)
 */
const complaintValidationRules = [
  body('customerId')
    .exists({ checkFalsy: true }).withMessage('customerId is required')
    .bail()
    .isString().withMessage('customerId must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('customerId must be 1-50 characters')
    .matches(/^[A-Za-z0-9_-]+$/).withMessage('customerId contains invalid characters'),

  body('complaintText')
    .exists({ checkFalsy: true }).withMessage('complaintText is required')
    .bail()
    .isString().withMessage('complaintText must be a string')
    .bail()
    .trim()
    .isLength({ min: 5, max: 2000 }).withMessage('complaintText must be 5-2000 characters'),
];

module.exports = { complaintValidationRules };
