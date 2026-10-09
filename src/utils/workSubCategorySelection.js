export const getInitialWorkClassification = ({ editItem = null, parentItem = null } = {}) => {
  const workCategoryId = parentItem?.workCategoryId || editItem?.workCategoryId || '';
  const workSubCategoryId = editItem?.isHeaderOnly
    ? ''
    : (editItem?.workSubCategoryId || '');

  return { workCategoryId, workSubCategoryId };
};

export const changeWorkCategory = (classification, workCategoryId) => ({
  ...classification,
  workCategoryId,
  workSubCategoryId: '',
});

export const getWorkSubCategoryValidationError = ({
  isHeaderOnly,
  projectHasWorkCategories = true,
  workCategoryId,
  workSubCategoryId,
  isEdit = false,
  classificationTouched = true,
  subcategoryOptionsLoaded = false,
  subcategoryOptionCount = null,
}) => {
  if (!projectHasWorkCategories || isHeaderOnly || !workCategoryId) return null;
  if (isEdit && !classificationTouched) return null;
  if (workSubCategoryId) return null;
  if (subcategoryOptionsLoaded && subcategoryOptionCount === 0) {
    return 'Kategori ini belum memiliki subkategori aktif. Tambahkan subkategori terlebih dahulu di halaman Kategori Pekerjaan.';
  }
  return 'Pilih subkategori pekerjaan.';
};

const normalizeId = (value) => value || null;

export const hasWorkClassificationChanged = (original = {}, next = {}) => (
  Boolean(original.isHeaderOnly) !== Boolean(next.isHeaderOnly)
  || normalizeId(original.workCategoryId) !== normalizeId(next.workCategoryId)
  || normalizeId(original.workSubCategoryId) !== normalizeId(next.workSubCategoryId)
  || normalizeId(original.parentBvItemId) !== normalizeId(next.parentBvItemId)
);

export const requiresHeaderCategoryChangeConfirmation = ({
  editItem,
  hasChildren,
  nextWorkCategoryId,
} = {}) => Boolean(
  editItem?.isHeaderOnly
  && hasChildren
  && normalizeId(editItem.workCategoryId) !== normalizeId(nextWorkCategoryId)
);

export const getSubcategoryCellLabel = (item = {}) => {
  if (item.isHeaderOnly || !(item.workCategoryId || item.workCategory)) return '';
  return item.workSubCategory?.code || item.workSubCategory?.name || 'Belum ditentukan';
};

export const buildRabSwitchClassification = ({
  itemWorkCategoryId,
  activeWorkCategoryId,
  activeDiscipline,
  allCategoryFilter = 'SEMUA',
} = {}) => {
  const workCategoryId = itemWorkCategoryId || activeWorkCategoryId || undefined;
  return {
    workCategoryId,
    ahspDiscipline: workCategoryId || !activeDiscipline || activeDiscipline === allCategoryFilter
      ? undefined
      : activeDiscipline,
  };
};

export const resolveBulkRabWorkCategoryId = (items = [], selectedIds = [], activeWorkCategoryId = null) => {
  const selected = items.filter((item) => selectedIds.includes(item.id));
  const categoryIds = new Set(selected.map((item) => item.workCategoryId || null));
  if (categoryIds.size > 1) {
    throw new TypeError('Item dari kategori berbeda tidak dapat diganti AHSP secara bersamaan.');
  }
  const selectedCategoryId = categoryIds.size ? [...categoryIds][0] : null;
  if (activeWorkCategoryId && selectedCategoryId && activeWorkCategoryId !== selectedCategoryId) {
    throw new TypeError('Kategori item tidak sesuai dengan kategori aktif.');
  }
  return selectedCategoryId || activeWorkCategoryId || undefined;
};

export const getBvDisciplinePayload = ({ workCategoryId, disciplineLabel } = {}) => {
  if (workCategoryId) return undefined;
  const legacy = String(disciplineLabel || '').trim().toUpperCase();
  return ['SIPIL', 'INTERIOR'].includes(legacy) ? legacy : undefined;
};

export const getWorkClassificationLabel = (item = {}) => ({
  category: String(item.workCategory?.code || item.disciplineLabel || item.discipline || 'GENERAL').toUpperCase(),
  subcategory: item.isHeaderOnly
    ? ''
    : (item.workSubCategory?.code || item.workSubCategory?.name || (item.workCategory ? 'Belum ditentukan' : '')),
});
