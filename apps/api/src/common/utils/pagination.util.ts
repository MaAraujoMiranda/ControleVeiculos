export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number,
) {
  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    total,
    page,
    pageSize,
    pageCount,
    hasNextPage: pageCount > 0 && page < pageCount,
    hasPreviousPage: page > 1,
  };
}
