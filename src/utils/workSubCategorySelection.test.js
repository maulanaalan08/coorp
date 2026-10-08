import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getInitialWorkClassification,
  changeWorkCategory,
  getWorkSubCategoryValidationError,
  getWorkClassificationLabel,
  getSubcategoryCellLabel,
  hasWorkClassificationChanged,
  requiresHeaderCategoryChangeConfirmation,
} from './workSubCategorySelection.js';

test('child inherits its parent category while preserving an existing leaf subcategory', () => {
  assert.deepEqual(
    getInitialWorkClassification({
      parentItem: { workCategoryId: 'cat-parent' },
      editItem: { workCategoryId: null, workSubCategoryId: 'sub-1', isHeaderOnly: false },
    }),
    { workCategoryId: 'cat-parent', workSubCategoryId: 'sub-1' },
  );
});

test('child inherits parent category even when an old child category differs', () => {
  assert.deepEqual(
    getInitialWorkClassification({
      parentItem: { workCategoryId: 'cat-parent' },
      editItem: { workCategoryId: 'cat-old', workSubCategoryId: 'sub-1', isHeaderOnly: false },
    }),
    { workCategoryId: 'cat-parent', workSubCategoryId: 'sub-1' },
  );
});

test('header classification always clears subcategory', () => {
  assert.deepEqual(
    getInitialWorkClassification({
      editItem: { workCategoryId: 'cat-1', workSubCategoryId: 'stale-sub', isHeaderOnly: true },
    }),
    { workCategoryId: 'cat-1', workSubCategoryId: '' },
  );
});

test('changing category clears stale subcategory', () => {
  assert.deepEqual(
    changeWorkCategory({ workCategoryId: 'cat-1', workSubCategoryId: 'sub-1' }, 'cat-2'),
    { workCategoryId: 'cat-2', workSubCategoryId: '' },
  );
});

test('leaf requires an active subcategory but header does not', () => {
  assert.equal(
    getWorkSubCategoryValidationError({ isHeaderOnly: false, workCategoryId: 'cat-1', workSubCategoryId: '' }),
    'Pilih subkategori pekerjaan.',
  );
  assert.equal(
    getWorkSubCategoryValidationError({ isHeaderOnly: false, workCategoryId: 'cat-1', workSubCategoryId: 'sub-1' }),
    null,
  );
  assert.equal(
    getWorkSubCategoryValidationError({ isHeaderOnly: true, workCategoryId: 'cat-1', workSubCategoryId: '' }),
    null,
  );
});

test('legacy null leaf displays Belum ditentukan', () => {
  assert.equal(
    getWorkClassificationLabel({ workCategory: { code: 'SIPIL' }, workSubCategory: null }).subcategory,
    'Belum ditentukan',
  );
});

test('header classification leaves subcategory blank', () => {
  assert.equal(
    getWorkClassificationLabel({ isHeaderOnly: true, workCategory: { code: 'SIPIL' } }).subcategory,
    '',
  );
});

test('legacy discipline-only leaf does not require a subcategory', () => {
  assert.equal(
    getWorkSubCategoryValidationError({
      isHeaderOnly: false,
      projectHasWorkCategories: false,
      workCategoryId: '',
      workSubCategoryId: '',
      isEdit: false,
    }),
    null,
  );
});

test('new leaf in a category-configured project requires a subcategory', () => {
  assert.equal(
    getWorkSubCategoryValidationError({
      isHeaderOnly: false,
      projectHasWorkCategories: true,
      workCategoryId: 'cat-1',
      workSubCategoryId: '',
      isEdit: false,
    }),
    'Pilih subkategori pekerjaan.',
  );
});

test('unrelated edit of a legacy category leaf is not blocked by missing subcategory', () => {
  assert.equal(
    getWorkSubCategoryValidationError({
      isHeaderOnly: false,
      projectHasWorkCategories: true,
      workCategoryId: 'cat-1',
      workSubCategoryId: '',
      isEdit: true,
      classificationTouched: false,
    }),
    null,
  );
});

test('classification edit of a legacy category leaf requires a subcategory', () => {
  assert.equal(
    getWorkSubCategoryValidationError({
      isHeaderOnly: false,
      projectHasWorkCategories: true,
      workCategoryId: 'cat-1',
      workSubCategoryId: '',
      isEdit: true,
      classificationTouched: true,
    }),
    'Pilih subkategori pekerjaan.',
  );
});

test('classification change compares type, category, subcategory, and parent', () => {
  const original = {
    isHeaderOnly: false,
    workCategoryId: 'cat-1',
    workSubCategoryId: null,
    parentBvItemId: null,
  };
  assert.equal(hasWorkClassificationChanged(original, { ...original }), false);
  assert.equal(hasWorkClassificationChanged(original, { ...original, workCategoryId: 'cat-2' }), true);
  assert.equal(hasWorkClassificationChanged(original, { ...original, workSubCategoryId: 'sub-1' }), true);
  assert.equal(hasWorkClassificationChanged(original, { ...original, isHeaderOnly: true }), true);
  assert.equal(hasWorkClassificationChanged(original, { ...original, parentBvItemId: 'parent-1' }), true);
});

test('category change confirmation is required only for an edited header with children', () => {
  const base = {
    editItem: { id: 'header-1', isHeaderOnly: true, workCategoryId: 'cat-1' },
    hasChildren: true,
  };
  assert.equal(requiresHeaderCategoryChangeConfirmation({ ...base, nextWorkCategoryId: 'cat-2' }), true);
  assert.equal(requiresHeaderCategoryChangeConfirmation({ ...base, nextWorkCategoryId: 'cat-1' }), false);
  assert.equal(requiresHeaderCategoryChangeConfirmation({ ...base, hasChildren: false, nextWorkCategoryId: 'cat-2' }), false);
  assert.equal(requiresHeaderCategoryChangeConfirmation({ editItem: null, hasChildren: true, nextWorkCategoryId: 'cat-2' }), false);
});

test('subcategory column label follows header, leaf, and legacy rules', () => {
  assert.equal(getSubcategoryCellLabel({ isHeaderOnly: true, workCategoryId: 'cat-1' }), '');
  assert.equal(
    getSubcategoryCellLabel({ workCategoryId: 'cat-1', workSubCategory: { code: 'BATA' } }),
    'BATA',
  );
  assert.equal(
    getSubcategoryCellLabel({ workCategoryId: 'cat-1', workSubCategory: null }),
    'Belum ditentukan',
  );
  assert.equal(
    getSubcategoryCellLabel({ workCategoryId: null, disciplineLabel: 'SIPIL', workSubCategory: null }),
    '',
  );
});

test('empty subcategory option list blocks the new leaf with an explicit message', () => {
  const error = getWorkSubCategoryValidationError({
    isHeaderOnly: false,
    projectHasWorkCategories: true,
    workCategoryId: 'cat-1',
    workSubCategoryId: '',
    isEdit: false,
    subcategoryOptionsLoaded: true,
    subcategoryOptionCount: 0,
  });
  assert.match(error, /subkategori aktif/i);
  assert.equal(
    getWorkSubCategoryValidationError({
      isHeaderOnly: false,
      projectHasWorkCategories: true,
      workCategoryId: 'cat-1',
      workSubCategoryId: '',
      isEdit: false,
      subcategoryOptionsLoaded: false,
      subcategoryOptionCount: 0,
    }),
    'Pilih subkategori pekerjaan.',
  );
});
