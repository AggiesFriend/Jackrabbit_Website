import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEV_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = path.resolve(DEV_DIR, '..');
export const GAME_DIR = path.join(REPO_ROOT, 'tier_four');
export const SCREENSHOT_DIR = path.join(DEV_DIR, 'screenshots');
