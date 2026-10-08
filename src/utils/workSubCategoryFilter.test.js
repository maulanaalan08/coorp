import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterItemTreeBySubCategory,
  filterGroupTreeBySubCategory,
  countItemsBySubCategory,
  countGroupItemsBySubCategory,
} from './workSubCategoryFilter.js';

const itemTree = [
  {
    id: 'header', workSubCategoryId: null,
    children: [
      { id: 'infra', workSubCategoryId: 'sub-infra', children: [] },
      { id: 'gedung', workSubCategoryId: 'sub-gedung', children: [] },
    ],
  },
  { id: 'standalone', workSubCategoryId: 'sub-infra', children: [] },
];

test('subcategory filter keeps matching leaves and their header parent', () => {
  const filtered = filterItemTreeBySubCategory(itemTree, 'sub-infra');
  assert.deepEqual(filtered.map((item) => item.id), ['header', 'standalone']);
  assert.deepEqual(filtered[0].children.map((item) => item.id), ['infra']);
  assert.equal(countItemsBySubCategory(itemTree, 'sub-infra'), 2);
});

test('empty subcategory filter preserves the complete item tree', () => {
  assert.equal(filterItemTreeBySubCategory(itemTree, ''), itemTree);
});

test('RAB group filter drops empty branches and keeps a matching nested branch', () => {
  const groups = [
    { id: 'g1', items: itemTree, children: [] },
    { id: 'g2', items: [], children: [{ id: 'g2a', items: [{ id: 'mep', workSubCategoryId: 'sub-mep' }], children: [] }] },
  ];
  const filtered = filterGroupTreeBySubCategory(groups, 'sub-mep');
  assert.deepEqual(filtered.map((group) => group.id), ['g2']);
  assert.deepEqual(filtered[0].children.map((group) => group.id), ['g2a']);
  assert.equal(countGroupItemsBySubCategory(groups, 'sub-mep'), 1);
});
