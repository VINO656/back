/**
 * Standardized Mongoose Query Pagination & Filtering Helper
 * Safely applies sorting, field selection, and pagination without breaking
 * legacy frontend components that expect a direct array response when unpaginated.
 *
 * @param {Object} model - Mongoose Model
 * @param {Object} filter - MongoDB query filter object
 * @param {Object} queryParams - Express req.query object (`page`, `limit`, `sort`, `fields`, `paginate`)
 * @param {Object|Array} populateOptions - Mongoose populate arguments
 */
const paginateQuery = async (model, filter = {}, queryParams = {}, populateOptions = null) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.max(1, Math.min(parseInt(queryParams.limit, 10) || 100, 1000));
  const skip = (page - 1) * limit;

  // Sorting (defaults to -createdAt if schema supports it, else _id)
  const sort = queryParams.sort ? queryParams.sort.split(',').join(' ') : '-createdAt';

  // Field projection
  const select = queryParams.fields ? queryParams.fields.split(',').join(' ') : '';

  let query = model.find(filter).select(select).sort(sort);

  if (populateOptions) {
    if (Array.isArray(populateOptions)) {
      populateOptions.forEach(pop => { query = query.populate(pop); });
    } else {
      query = query.populate(populateOptions);
    }
  }

  // If explicit pagination requested via ?page=X or ?paginate=true
  if (queryParams.page || queryParams.paginate === 'true') {
    const total = await model.countDocuments(filter);
    const data = await query.skip(skip).limit(limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      }
    };
  }

  // Backward compatible default: execute query with safety limit
  return await query.limit(limit);
};

module.exports = { paginateQuery };
