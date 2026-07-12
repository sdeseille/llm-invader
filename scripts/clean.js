// Cross-platform "rm -rf dist" — évite toute dépendance à rimraf/rm/del
// (fs.rmSync existe nativement depuis Node 14.14+, aucune commande shell).
import { rmSync, mkdirSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

console.log('[clean] dist/ réinitialisé');
