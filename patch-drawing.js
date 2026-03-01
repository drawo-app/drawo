const fs = require('fs');
const content = fs.readFileSync('src/canvas/drawing.ts', 'utf8');

const updated = content.replace(
  'export const drawRoundedRect = (',
  'export const drawRoundedRectSubpath = (\n  ctx: CanvasRenderingContext2D,\n  x: number,\n  y: number,\n  width: number,\n  height: number,\n  radius: number,\n) => {\n  const limitedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));\n  ctx.moveTo(x + limitedRadius, y);\n  ctx.lineTo(x + width - limitedRadius, y);\n  ctx.quadraticCurveTo(x + width, y, x + width, y + limitedRadius);\n  ctx.lineTo(x + width, y + height - limitedRadius);\n  ctx.quadraticCurveTo(x + width, y + height, x + width - limitedRadius, y + height);\n  ctx.lineTo(x + limitedRadius, y + height);\n  ctx.quadraticCurveTo(x, y + height, x, y + height - limitedRadius);\n  ctx.lineTo(x, y + limitedRadius);\n  ctx.quadraticCurveTo(x, y, x + limitedRadius, y);\n  ctx.closePath();\n};\n\nexport const drawRoundedRect = ('
);

fs.writeFileSync('src/canvas/drawing.ts', updated);
console.log('Patched drawing.ts with drawRoundedRectSubpath');
