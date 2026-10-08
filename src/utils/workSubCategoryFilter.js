export const filterItemTreeBySubCategory = (items, workSubCategoryId) => {
  if (!workSubCategoryId) return items || [];
  return (items || []).reduce((result, item) => {
    const matchingChildren = filterItemTreeBySubCategory(item.children || [], workSubCategoryId);
    const matches = item.workSubCategoryId === workSubCategoryId;
    if (matches || matchingChildren.length > 0) {
      result.push({ ...item, children: matchingChildren });
    }
    return result;
  }, []);
};

export const filterGroupTreeBySubCategory = (groups, workSubCategoryId) => {
  if (!workSubCategoryId) return groups || [];
  return (groups || []).reduce((result, group) => {
    const items = filterItemTreeBySubCategory(group.items || [], workSubCategoryId);
    const children = filterGroupTreeBySubCategory(group.children || [], workSubCategoryId);
    if (items.length > 0 || children.length > 0) {
      result.push({ ...group, items, children });
    }
    return result;
  }, []);
};

export const countItemsBySubCategory = (items, workSubCategoryId) => (
  (items || []).reduce((count, item) => (
    count
    + (item.workSubCategoryId === workSubCategoryId ? 1 : 0)
    + countItemsBySubCategory(item.children || [], workSubCategoryId)
  ), 0)
);

export const countGroupItemsBySubCategory = (groups, workSubCategoryId) => (
  (groups || []).reduce((count, group) => (
    count
    + countItemsBySubCategory(group.items || [], workSubCategoryId)
    + countGroupItemsBySubCategory(group.children || [], workSubCategoryId)
  ), 0)
);
