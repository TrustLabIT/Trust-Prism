// Shared cursor-less (page/limit) pagination for list endpoints.
function parsePage(q = {}) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 24));
  return { page, limit, skip: (page - 1) * limit };
}

// map: optional (async) transform per doc; defaults to toCard()/toJSON()/raw.
async function paginate(model, filter, { page, limit, sort = { createdAt: -1 }, map } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
  const skip = (p - 1) * l;
  const [docs, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(l),
    model.countDocuments(filter),
  ]);
  const transform = map || ((d) => (typeof d.toCard === "function" ? d.toCard() : d));
  const items = await Promise.all(docs.map(transform));
  return { items, total, page: p, limit: l, hasMore: skip + docs.length < total, pages: Math.ceil(total / l) };
}

module.exports = { parsePage, paginate };
