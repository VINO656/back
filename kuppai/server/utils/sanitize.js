/**
 * Utility function to sanitize request body before database updates.
 * Prevents Mass Assignment Vulnerabilities where clients try to overwrite
 * immutable or sensitive fields like _id, unitId, or createdBy.
 *
 * @param {Object} body - The raw request body object from Express (req.body)
 * @param {Array<string>} extraProtectedFields - Additional fields to strip if needed
 * @returns {Object} Cleaned object safe for findByIdAndUpdate
 */
const sanitizeUpdate = (body = {}, extraProtectedFields = []) => {
  if (typeof body !== 'object' || body === null) return {};

  // Create a shallow copy so we don't mutate req.body directly
  const cleanBody = { ...body };

  // Default immutable fields that should never be overwritten via standard PUT/PATCH
  const defaultProtected = [
    '_id',
    'id',
    'unitId',
    'createdBy',
    'createdAt',
    '__v'
  ];

  const fieldsToRemove = [...defaultProtected, ...extraProtectedFields];

  for (const field of fieldsToRemove) {
    delete cleanBody[field];
  }

  return cleanBody;
};

module.exports = {
  sanitizeUpdate
};
