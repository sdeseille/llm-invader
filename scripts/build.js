// Pipeline de build pour un jeu js13k mono-fichier (index.html avec
// <script> inline). Étapes :
//   1. Lire index.html (source de développement, à la racine du projet)
//   2. Extraire le contenu du <script> inline
//   3. Minifier avec Terser
//   4. Compresser davantage avec Roadroller (packer + décodeur inline)
//   5. Réinjecter le résultat dans le HTML -> dist/index.html
//
// Aucune commande shell, aucun binaire externe : Node pur, fonctionne
// identiquement sous Windows/macOS/Linux.

import { readFileSync, writeFileSync } from 'node:fs';
import { minify } from 'terser';
import { Packer } from 'roadroller';

const SRC_HTML = 'index.html';
const OUT_HTML = 'dist/index.html';

// Active/désactive Roadroller. Roadroller a un coût fixe de décodeur
// (~400-500 octets) : il ne devient rentable que si le JS minifié dépasse
// quelques Ko. Sur un petit jeu, teste les deux (RR=0 puis RR=1 dans les
// variables d'env) et garde la sortie la plus petite après zip.
const USE_ROADROLLER = process.env.RR !== '0';

async function main() {
  const html = readFileSync(SRC_HTML, 'utf8');

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    console.error(`[build] Aucun <script> inline trouvé dans ${SRC_HTML}`);
    process.exit(1);
  }
  const rawJs = scriptMatch[1];

  // 1) Minification Terser
  const minified = await minify(rawJs, {
    module: false,
    compress: {
      passes: 3,
      unsafe: true,
      unsafe_arrows: true,
      unsafe_math: true,
      drop_console: true,
    },
    mangle: { toplevel: true },
  });

  if (minified.error) {
    console.error('[build] Erreur Terser :', minified.error);
    process.exit(1);
  }

  let finalJs = minified.code;
  let injectedAsModule = false;

  // 2) Roadroller (optionnel, voir commentaire ci-dessus)
  if (USE_ROADROLLER) {
    const packer = new Packer([
      {
        data: finalJs,
        type: 'js',
        action: 'eval',
      },
    ]);
    await packer.optimize(2); // 0 = rapide, 2 = optimisation poussée
    const { firstLine, secondLine } = packer.makeDecoder();
    finalJs = firstLine + secondLine;
    injectedAsModule = false; // Roadroller génère du JS classique auto-exécutant
  }

  // 3) Réinjection dans le HTML
  const outHtml = html.replace(
    scriptMatch[0],
    `<script>${finalJs}</script>`
  );

  writeFileSync(OUT_HTML, outHtml);

  const beforeKb = (rawJs.length / 1024).toFixed(2);
  const afterKb = (finalJs.length / 1024).toFixed(2);
  console.log(`[build] JS: ${beforeKb} Ko -> ${afterKb} Ko (${USE_ROADROLLER ? 'Terser+Roadroller' : 'Terser seul'})`);
  console.log(`[build] Écrit: ${OUT_HTML}`);
}

main().catch((err) => {
  console.error('[build] Échec :', err);
  process.exit(1);
});
