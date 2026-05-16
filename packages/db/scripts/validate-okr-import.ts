import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateOkrImportDocument, type OkrImportDocument } from '../src/okr-import-schema';

function resolveDefaultInputPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '../../../docs/data/okr-2026.json');
}

function parseArgs(argv: string[]) {
  const fileArg = argv.find((arg) => arg.startsWith('--file='));
  return {
    file: fileArg ? fileArg.slice('--file='.length) : resolveDefaultInputPath(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = fs.readFileSync(args.file, 'utf8');
  const document = JSON.parse(raw) as OkrImportDocument;
  const result = validateOkrImportDocument(document);

  console.log(JSON.stringify({
    file: args.file,
    ...result,
  }, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main();
