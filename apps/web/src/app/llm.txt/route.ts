import { v1Spec } from '@stride-os/api-contract';
import { env } from '@stride-os/db/env';

export const dynamic = 'force-static';

function countPaths() {
  return Object.keys(v1Spec.paths).length;
}

export function GET() {
  const appUrl = env.appUrl.replace(/\/$/, '');
  const lines = [
    'Stride OS',
    '',
    'Stride OS is a self-hosted, agent-native personal execution system for tasks, OKRs, reviews, and activity history.',
    '',
    'External API base URL:',
    appUrl,
    '',
    'Primary machine-readable API contract:',
    `${appUrl}/api/openapi.json`,
    '',
    'Authentication:',
    '- Preferred for agents and automation: Authorization: Bearer <api_key>',
    '- Browser sessions may also use the session cookie',
    '',
    'Recommended first call:',
    `- GET ${appUrl}/api/v1/me`,
    '',
    'Important usage notes:',
    '- Treat the OpenAPI document as the source of truth for paths, request bodies, and response schemas',
    '- Use /api/auth/login and /api/tokens only when a browser/session-based flow is needed to mint or manage personal API keys',
    '- For task deletion semantics, prefer archive endpoints instead of assuming hard delete',
    '',
    'Human-oriented integration guide:',
    `${appUrl}/docs/api-external-access.md`,
    '',
    `Current published OpenAPI path count: ${countPaths()}`,
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
