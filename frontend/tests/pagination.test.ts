import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PAGE_SIZE, emptyPagination, PAGE_SIZE_OPTIONS } from '../src/lib/pagination.ts';

test('all paginated screens default to ten rows', () => {
  assert.equal(DEFAULT_PAGE_SIZE, 10);
  assert.equal(emptyPagination.pageSize, 10);
  assert.equal(PAGE_SIZE_OPTIONS[0], 10);
});
