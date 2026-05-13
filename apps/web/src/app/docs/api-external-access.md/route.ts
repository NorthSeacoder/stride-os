import { externalApiGuide } from '@/lib/external-api-guide';

export const dynamic = 'force-static';

export async function GET() {
  return new Response(externalApiGuide, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
