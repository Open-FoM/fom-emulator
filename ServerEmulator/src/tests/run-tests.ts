import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

const ROOT = path.resolve(__dirname);
const SELF = path.resolve(__filename);

function walk(dir: string, files: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith('_') || entry.name === 'fixtures') {
            continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, files);
        } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
            files.push(full);
        }
    }
    return files;
}

async function run(): Promise<void> {
    const testFiles = walk(ROOT)
        .filter((file) => path.resolve(file) !== SELF)
        .sort((a, b) => a.localeCompare(b));

    for (const file of testFiles) {
        // Import executes the test file; failures bubble up.
        await import(pathToFileURL(file).href);
    }

    // eslint-disable-next-line no-console
    console.log(`[Tests] Loaded ${testFiles.length} test files`);
}

run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`[Tests] Unhandled error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
});
