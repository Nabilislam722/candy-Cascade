// Builds a self-contained copy of the game into dist/:
//   dist/index.html     one HTML file with the bundled script, styles and fonts inlined
//   dist/artifact.html  the same page without the document wrapper (for hosts that add their own)
//   dist/assets/        the PNG art the page loads
import { build, transform } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const between = (text, start, end) => {
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < 0) throw new Error(`Markers ${start} / ${end} not found`);
  return text.slice(a + start.length, b).trim();
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const bundle = await build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020'],
  legalComments: 'none',
  write: false,
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

let css = await readFile(join(root, 'styles.css'), 'utf8');
const fonts = [...css.matchAll(/url\('(assets\/fonts\/[^']+\.woff2)'\)/g)].map((m) => m[1]);
for (const path of new Set(fonts)) {
  const data = (await readFile(join(root, path))).toString('base64');
  css = css.replaceAll(`url('${path}')`, `url(data:font/woff2;base64,${data})`);
}
css = (await transform(css, { loader: 'css', minify: true })).code.trim();

const html = await readFile(join(root, 'index.html'), 'utf8');
const app = between(html, '<!-- app:start -->', '<!-- app:end -->');
const title = between(html, '<title>', '</title>');
const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '';

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#66d6da">
<meta name="description" content="${description}">
<title>${title}</title>
<link rel="icon" type="image/png" href="assets/candies/star.png">
<style>${css}</style>
</head>
<body>
${app}
<script>${js}</script>
</body>
</html>
`;

const fragment = `<title>${title}</title>
<style>${css}</style>
${app}
<script>${js}</script>
`;

await writeFile(join(dist, 'index.html'), page);
await writeFile(join(dist, 'artifact.html'), fragment);
for (const folder of ['candies', 'items', 'ui']) {
  await cp(join(root, 'assets', folder), join(dist, 'assets', folder), { recursive: true });
}
const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`;
console.log(`dist/index.html ${kb(page)} (script ${kb(js)}, styles ${kb(css)})`);
console.log(`dist/artifact.html ${kb(fragment)}`);
