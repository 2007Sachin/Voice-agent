import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { InterviewSession } from './types.js';

/**
 * JSON-file session store. One file per session under DATA_DIR
 * (default ./data/sessions). Writes go through a temp file + rename
 * so a crash mid-write never corrupts an existing session.
 */

function dataDir(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), 'data', 'sessions');
}

function sessionPath(id: string): string {
  // ids are server-generated UUIDs; reject anything path-like defensively
  if (!/^[A-Za-z0-9-]+$/.test(id)) throw new Error(`Invalid session id: ${id}`);
  return path.join(dataDir(), `${id}.json`);
}

export async function saveSession(session: InterviewSession): Promise<void> {
  const file = sessionPath(session.id);
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(session, null, 2), 'utf8');
  await rename(tmp, file);
}

export async function getSession(id: string): Promise<InterviewSession | null> {
  try {
    const raw = await readFile(sessionPath(id), 'utf8');
    return JSON.parse(raw) as InterviewSession;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}
