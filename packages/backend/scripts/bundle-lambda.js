const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const outdir = path.join(__dirname, '../dist/lambda');

// Clean output directory
if (fs.existsSync(outdir)) {
  fs.rmSync(outdir, { recursive: true });
}
fs.mkdirSync(outdir, { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(__dirname, '../src/lambda.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.join(outdir, 'index.js'),
  external: ['@aws-sdk/*'], // AWS SDK v3 is included in Lambda runtime
  minify: true,
  sourcemap: true,
});

console.log('✅ Lambda bundle created at dist/lambda/index.js');
