// Crée dist.zip à partir de dist/, et rapporte la taille par rapport à la
// limite js13kGames (13 312 octets). Utilise "archiver" (pur JS, aucun
// binaire système type zip/7z requis) : fonctionne identiquement sous
// Windows.

import { createWriteStream, existsSync, statSync } from 'node:fs';
import archiver from 'archiver';

const LIMIT_BYTES = 13312;
const OUT_ZIP = 'dist.zip';

if (!existsSync('dist')) {
  console.error('[zip] dist/ introuvable — lance "npm run build" avant "npm run zip".');
  process.exit(1);
}

const output = createWriteStream(OUT_ZIP);
// Niveau de compression max (9). Pour un gain supplémentaire de quelques
// dizaines d'octets par rapport à zlib niveau 9, un outil externe comme
// ECT/advzip peut aider, mais nécessite un binaire non-npm — voir AGENT.md.
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const size = statSync(OUT_ZIP).size;
  const pct = ((size / LIMIT_BYTES) * 100).toFixed(1);
  const remaining = LIMIT_BYTES - size;

  console.log(`[zip] ${OUT_ZIP} : ${size} octets / ${LIMIT_BYTES} (${pct}%)`);

  if (remaining < 0) {
    console.error(`[zip] ❌ DÉPASSEMENT de ${-remaining} octets — le zip ne passe pas la limite js13k.`);
    process.exitCode = 1;
  } else {
    console.log(`[zip] ✅ OK — il reste ${remaining} octets de marge.`);
  }
});

archive.on('error', (err) => {
  console.error('[zip] Erreur archiver :', err);
  process.exitCode = 1;
});

archive.pipe(output);
archive.directory('dist/', false);
archive.finalize();
