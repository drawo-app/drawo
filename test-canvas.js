const { createCanvas } = require('canvas');
const fs = require('fs');

const canvas = createCanvas(200, 200);
const ctx = canvas.getContext('2d');

ctx.fillStyle = 'white';
ctx.fillRect(0, 0, 200, 200);

ctx.globalAlpha = 0.5;
ctx.fillStyle = 'red';

// Test if path self-intersection doubles transparency
ctx.beginPath();
ctx.rect(50, 50, 60, 60);
ctx.rect(80, 80, 60, 60); // Overlaps the first rect
ctx.fill();

fs.writeFileSync('test.png', canvas.toBuffer());
