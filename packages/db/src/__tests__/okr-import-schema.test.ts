import { describe, expect, it } from 'vitest';
import { validateOkrImportDocument, type OkrImportDocument } from '../okr-import-schema';

describe('okr import schema validation', () => {
  it('accepts the checked-in 2026 import document', () => {
    const document: OkrImportDocument = {
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
          name: '公考备考',
          kind: 'user',
          slug: 'civil-service-exam',
          sortOrder: 1,
          objectives: [
            {
              refId: 'O1-civil-service-study-rhythm',
              title: '建立稳定的公考备考节奏',
              status: 'active',
              sortOrder: 1,
              keyResults: [
                {
                  refId: 'O1-KR1-effective-study-days',
                  title: '有效学习日累计',
                  status: 'active',
                },
                {
                  refId: 'O1-KR2-study-phase-plan',
                  title: '年度备考阶段计划',
                  status: 'active',
                },
              ],
            },
          ],
        },
        {
          name: '健康修复',
          kind: 'user',
          slug: 'health-repair',
          sortOrder: 2,
          objectives: [
            {
              refId: 'O2-health-repair-and-fat-loss',
              title: '建立可持续的健康修复与减脂系统',
              status: 'active',
              sortOrder: 1,
              keyResults: [
                { refId: 'O2-KR1-morning-cardio-sessions', title: '晨间有氧累计', status: 'active' },
                { refId: 'O2-KR2-afternoon-training-sessions', title: '训练累计', status: 'active' },
                { refId: 'O2-KR3-weight-trend', title: '体重趋势控制', status: 'active' },
                { refId: 'O2-KR4-medical-followups-and-treatment', title: '复查与治疗排期', status: 'active' },
              ],
            },
          ],
        },
        {
          name: '内容副业',
          kind: 'user',
          slug: 'content-business',
          sortOrder: 3,
          objectives: [
            {
              refId: 'O3-side-business-output',
              title: '让内容副业形成稳定产出',
              status: 'active',
              sortOrder: 1,
              keyResults: [
                { refId: 'O3-KR1-novel-output', title: '小说产出', status: 'active' },
                { refId: 'O3-KR2-wechat-publishing', title: '公众号发布', status: 'active' },
                { refId: 'O3-KR3-xiaohongshu-start', title: '小红书起量验证', status: 'active' },
              ],
            },
          ],
        },
        {
          name: '个人经营',
          kind: 'user',
          slug: 'personal-operations',
          sortOrder: 4,
          objectives: [
            {
              refId: 'O4-personal-operations-foundation',
              title: '完成个人经营与项目基础建设',
              status: 'active',
              sortOrder: 1,
              keyResults: [
                { refId: 'O4-KR1-self-employed-and-social-security', title: '个体工商户与社保落地', status: 'active' },
                { refId: 'O4-KR2-weekly-issues-published', title: '周刊发布', status: 'active' },
                { refId: 'O4-KR3-resume-site-online', title: '简历网站更新上线', status: 'active' },
              ],
            },
          ],
        },
      ],
    };
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
