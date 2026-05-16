import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateOkrImportDocument, type OkrImportDocument } from '../okr-import-schema';

const importFile = path.resolve(process.cwd(), 'docs/data/okr-2026.json');

describe('okr import schema validation', () => {
  it('accepts the checked-in 2026 import document', () => {
    const document = JSON.parse(fs.readFileSync(importFile, 'utf8')) as OkrImportDocument;
    const result = validateOkrImportDocument(document);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.summary).toEqual({
      taskListCount: 4,
      objectiveCount: 4,
      keyResultCount: 12,
    });
  });

  it('rejects duplicate refs and invalid enums', () => {
    const invalid: OkrImportDocument = {
      period: {
        name: '2026',
        type: 'year',
        year: 2026,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'active',
      },
      taskLists: [
        {
          name: 'List A',
          kind: 'user',
          slug: 'duplicate-slug',
          sortOrder: 1,
          objectives: [
            {
              refId: 'objective-1',
              title: 'Objective A',
              status: 'active',
              sortOrder: 1,
              keyResults: [
                {
                  refId: 'kr-1',
                  title: 'KR A',
                  status: 'active',
                  description: 'Result A',
                },
              ],
            },
          ],
        },
        {
          name: 'List B',
          kind: 'user',
          slug: 'duplicate-slug',
          sortOrder: 2,
          objectives: [
            {
              refId: 'objective-1',
              title: 'Objective B',
              status: 'wrong' as never,
              sortOrder: 1,
              keyResults: [
                {
                  refId: 'kr-1',
                  title: 'KR B',
                  status: 'ongoing' as never,
                  description: 'Result B',
                },
              ],
            },
          ],
        },
      ],
    };

    const result = validateOkrImportDocument(invalid);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'taskLists contain duplicate slug values',
      'objectives contain duplicate refId values',
      'keyResults contain duplicate refId values',
      'objective.objective-1.status has invalid value: wrong',
      'keyResult.kr-1.status has invalid value: ongoing',
    ]));
  });
});
