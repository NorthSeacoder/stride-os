import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { expectJsonError, jsonRequest } from './helpers';

const archivePeriod = vi.fn();
const createKeyResult = vi.fn();
const createKrCheckIn = vi.fn();
const createObjective = vi.fn();
const createPeriod = vi.fn();
const getCurrentPeriodSummary = vi.fn();
const getKeyResultDetail = vi.fn();
const getObjective = vi.fn();
const getPeriod = vi.fn();
const listKeyResultCheckIns = vi.fn();
const listObjectives = vi.fn();
const listPeriods = vi.fn();
const updateKeyResult = vi.fn();
const updateObjective = vi.fn();
const updatePeriod = vi.fn();

vi.mock('@/lib/auth/api-auth', () => ({
  getAuthUser: vi.fn(async (request: NextRequest) => {
    return request.headers.get('authorization') === 'Bearer ok'
      ? { id: 'user_1', activityContext: { actorType: 'user', actorId: 'user_1', source: 'api' } }
      : null;
  }),
}));

vi.mock('@/lib/services/okr-service', () => ({
  CHECK_IN_CONFIDENCE: ['low', 'medium', 'high'],
  KEY_RESULT_STATUSES: ['active', 'at_risk', 'done', 'archived'],
  KEY_RESULT_TYPES: ['numeric', 'milestone', 'hybrid'],
  OBJECTIVE_STATUSES: ['active', 'done', 'archived'],
  PERIOD_STATUSES: ['active', 'archived'],
  PERIOD_TYPES: ['year', 'quarter', 'month', 'custom'],
  archivePeriod: (...args: unknown[]) => archivePeriod(...args),
  createKeyResult: (...args: unknown[]) => createKeyResult(...args),
  createKrCheckIn: (...args: unknown[]) => createKrCheckIn(...args),
  createObjective: (...args: unknown[]) => createObjective(...args),
  createPeriod: (...args: unknown[]) => createPeriod(...args),
  getCurrentPeriodSummary: (...args: unknown[]) => getCurrentPeriodSummary(...args),
  getKeyResultDetail: (...args: unknown[]) => getKeyResultDetail(...args),
  getObjective: (...args: unknown[]) => getObjective(...args),
  getPeriod: (...args: unknown[]) => getPeriod(...args),
  listKeyResultCheckIns: (...args: unknown[]) => listKeyResultCheckIns(...args),
  listObjectives: (...args: unknown[]) => listObjectives(...args),
  listPeriods: (...args: unknown[]) => listPeriods(...args),
  updateKeyResult: (...args: unknown[]) => updateKeyResult(...args),
  updateObjective: (...args: unknown[]) => updateObjective(...args),
  updatePeriod: (...args: unknown[]) => updatePeriod(...args),
}));

import { GET as periodsGet, POST as periodsPost } from '@/app/api/v1/okr/periods/route';
import { GET as periodGet, PATCH as periodPatch } from '@/app/api/v1/okr/periods/[id]/route';
import { POST as periodArchivePost } from '@/app/api/v1/okr/periods/[id]/archive/route';
import { GET as periodObjectivesGet } from '@/app/api/v1/okr/periods/[id]/objectives/route';
import { POST as objectivesPost } from '@/app/api/v1/okr/objectives/route';
import { GET as objectiveGet, PATCH as objectivePatch } from '@/app/api/v1/okr/objectives/[id]/route';
import { POST as objectiveArchivePost } from '@/app/api/v1/okr/objectives/[id]/archive/route';
import { POST as keyResultsPost } from '@/app/api/v1/okr/key-results/route';
import { GET as keyResultGet, PATCH as keyResultPatch } from '@/app/api/v1/okr/key-results/[id]/route';
import { POST as keyResultArchivePost } from '@/app/api/v1/okr/key-results/[id]/archive/route';
import { GET as checkInsGet, POST as checkInsPost } from '@/app/api/v1/okr/key-results/[id]/check-ins/route';
import { GET as legacyCheckInsGet } from '@/app/api/v1/key-results/[id]/check-ins/route';
import { GET as currentOkrGet } from '@/app/api/v1/okr/current/route';

describe('okr automation api routes', () => {
  beforeEach(() => {
    getCurrentPeriodSummary.mockResolvedValue({ period: { id: 'period_1', name: '2026 Q2' } });
  });

  it('returns 401 for protected OKR routes without auth', async () => {
    const response = await periodsGet(new NextRequest('http://localhost/api/v1/okr/periods'));
    await expectJsonError(response, 401, 'Unauthorized');
  });

  it('handles period list, create, detail, update, and archive', async () => {
    listPeriods.mockResolvedValue([{ id: 'period_1' }]);
    createPeriod.mockResolvedValue({ id: 'period_1', name: '2026 Q2' });
    getPeriod.mockResolvedValue({ id: 'period_1', name: '2026 Q2' });
    updatePeriod.mockResolvedValue({ id: 'period_1', name: '2026 Q2 updated' });
    archivePeriod.mockResolvedValue({ id: 'period_1', status: 'archived' });

    expect((await periodsGet(new NextRequest('http://localhost/api/v1/okr/periods', { headers: { authorization: 'Bearer ok' } }))).status).toBe(200);
    expect((await periodsPost(jsonRequest('http://localhost/api/v1/okr/periods', {
      auth: 'ok',
      body: { name: '2026 Q2', type: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30' },
    }))).status).toBe(201);
    expect((await periodGet(new NextRequest('http://localhost/api/v1/okr/periods/period_1', { headers: { authorization: 'Bearer ok' } }), { params: Promise.resolve({ id: 'period_1' }) })).status).toBe(200);
    expect((await periodPatch(jsonRequest('http://localhost/api/v1/okr/periods/period_1', { auth: 'ok', method: 'PATCH', body: { name: '2026 Q2 updated' } }), { params: Promise.resolve({ id: 'period_1' }) })).status).toBe(200);
    expect((await periodArchivePost(jsonRequest('http://localhost/api/v1/okr/periods/period_1/archive', { auth: 'ok' }), { params: Promise.resolve({ id: 'period_1' }) })).status).toBe(200);
  });

  it('validates period input', async () => {
    const response = await periodsPost(jsonRequest('http://localhost/api/v1/okr/periods', {
      auth: 'ok',
      body: { name: '', type: 'bad', startDate: '2026-01-01', endDate: '2026-12-31' },
    }));
    await expectJsonError(response, 400, 'type is invalid');
  });

  it('handles objective list, create, detail, update, and archive', async () => {
    listObjectives.mockResolvedValue([{ id: 'obj_1' }]);
    createObjective.mockResolvedValue({ id: 'obj_1', title: 'Ship' });
    getObjective.mockResolvedValue({ id: 'obj_1', title: 'Ship' });
    updateObjective.mockResolvedValue({ id: 'obj_1', title: 'Ship better' });

    expect((await periodObjectivesGet(new NextRequest('http://localhost/api/v1/okr/periods/period_1/objectives', { headers: { authorization: 'Bearer ok' } }), { params: Promise.resolve({ id: 'period_1' }) })).status).toBe(200);
    expect((await objectivesPost(jsonRequest('http://localhost/api/v1/okr/objectives', { auth: 'ok', body: { periodId: 'period_1', title: 'Ship' } }))).status).toBe(201);
    expect((await objectiveGet(new NextRequest('http://localhost/api/v1/okr/objectives/obj_1', { headers: { authorization: 'Bearer ok' } }), { params: Promise.resolve({ id: 'obj_1' }) })).status).toBe(200);
    expect((await objectivePatch(jsonRequest('http://localhost/api/v1/okr/objectives/obj_1', { auth: 'ok', method: 'PATCH', body: { title: 'Ship better' } }), { params: Promise.resolve({ id: 'obj_1' }) })).status).toBe(200);
    expect((await objectiveArchivePost(jsonRequest('http://localhost/api/v1/okr/objectives/obj_1/archive', { auth: 'ok' }), { params: Promise.resolve({ id: 'obj_1' }) })).status).toBe(200);
  });

  it('handles key result create, detail, update, archive, and check-ins', async () => {
    createKeyResult.mockResolvedValue({ id: 'kr_1', title: 'Revenue' });
    getKeyResultDetail.mockResolvedValue({ id: 'kr_1', title: 'Revenue' });
    updateKeyResult.mockResolvedValue({ id: 'kr_1', status: 'at_risk' });
    listKeyResultCheckIns.mockResolvedValue([{ id: 'checkin_1' }]);
    createKrCheckIn.mockResolvedValue({ id: 'checkin_1', keyResultId: 'kr_1' });

    expect((await keyResultsPost(jsonRequest('http://localhost/api/v1/okr/key-results', { auth: 'ok', body: { objectiveId: 'obj_1', title: 'Revenue', type: 'numeric' } }))).status).toBe(201);
    expect((await keyResultGet(new NextRequest('http://localhost/api/v1/okr/key-results/kr_1', { headers: { authorization: 'Bearer ok' } }), { params: Promise.resolve({ id: 'kr_1' }) })).status).toBe(200);
    expect((await keyResultPatch(jsonRequest('http://localhost/api/v1/okr/key-results/kr_1', { auth: 'ok', method: 'PATCH', body: { status: 'at_risk' } }), { params: Promise.resolve({ id: 'kr_1' }) })).status).toBe(200);
    expect((await keyResultArchivePost(jsonRequest('http://localhost/api/v1/okr/key-results/kr_1/archive', { auth: 'ok' }), { params: Promise.resolve({ id: 'kr_1' }) })).status).toBe(200);
    expect((await checkInsGet(new NextRequest('http://localhost/api/v1/okr/key-results/kr_1/check-ins', { headers: { authorization: 'Bearer ok' } }), { params: Promise.resolve({ id: 'kr_1' }) })).status).toBe(200);
    expect((await checkInsPost(jsonRequest('http://localhost/api/v1/okr/key-results/kr_1/check-ins', { auth: 'ok', body: { confidence: 'medium', progressValue: 0.7 } }), { params: Promise.resolve({ id: 'kr_1' }) })).status).toBe(201);
    expect((await legacyCheckInsGet(new NextRequest('http://localhost/api/v1/key-results/kr_1/check-ins', { headers: { authorization: 'Bearer ok' } }), { params: Promise.resolve({ id: 'kr_1' }) })).status).toBe(200);
  });

  it('returns 400 for invalid key result type and missing check-in confidence', async () => {
    await expectJsonError(await keyResultsPost(jsonRequest('http://localhost/api/v1/okr/key-results', {
      auth: 'ok',
      body: { objectiveId: 'obj_1', title: 'Revenue', type: 'bad' },
    })), 400, 'type is invalid');
    await expectJsonError(await checkInsPost(jsonRequest('http://localhost/api/v1/okr/key-results/kr_1/check-ins', {
      auth: 'ok',
      body: { summary: 'No confidence' },
    }), { params: Promise.resolve({ id: 'kr_1' }) }), 400, 'confidence is required');
  });

  it('keeps current OKR route protected and available', async () => {
    const response = await currentOkrGet(new NextRequest('http://localhost/api/v1/okr/current', {
      headers: { authorization: 'Bearer ok' },
    }));
    expect(response.status).toBe(200);
  });
});
