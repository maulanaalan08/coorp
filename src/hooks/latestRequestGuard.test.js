import { describe, expect, it } from 'vitest';
import { createLatestRequestGuard } from './latestRequestGuard';

describe('createLatestRequestGuard', () => {
  it('menolak respons request project lama setelah project berganti', () => {
    const guard = createLatestRequestGuard();
    const requestA = guard.begin('project-a');
    const requestB = guard.begin('project-b');

    expect(guard.isCurrent(requestA, 'project-a')).toBe(false);
    expect(guard.isCurrent(requestB, 'project-b')).toBe(true);
  });

  it('invalidate membatalkan request aktif saat effect dibersihkan', () => {
    const guard = createLatestRequestGuard();
    const request = guard.begin('project-a');

    guard.invalidate();

    expect(guard.isCurrent(request, 'project-a')).toBe(false);
  });
});
