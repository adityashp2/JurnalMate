const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function createPng(size) {
  const width = size;
  const height = size;
  
  // Create RGBA image buffer with rounded icon, emerald/cyan gradient, and journal symbol
  const rawData = [];
  const radius = size * 0.22;
  
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter type: None
    for (let x = 0; x < width; x++) {
      // Check rounded rect
      let dx = Math.max(0, Math.max(radius - x, x - (width - 1 - radius)));
      let dy = Math.max(0, Math.max(radius - y, y - (height - 1 - radius)));
      let dist = Math.sqrt(dx * dx + dy * dy);
      
      let inside = dist <= radius;
      if (!inside) {
        // Transparent outside rounded corners
        rawData.push(0, 0, 0, 0);
        continue;
      }

      // Background gradient: Emerald to Deep Cyan / Teal
      // Top left: #10b981 (16, 185, 129), Bottom right: #06b6d4 (6, 182, 212) or #047857
      let t = (x + y) / (width + height);
      let bgR = Math.round(16 * (1 - t) + 14 * t);
      let bgG = Math.round(185 * (1 - t) + 116 * t);
      let bgB = Math.round(129 * (1 - t) + 144 * t);

      // Draw Notebook / Journal book shape in center
      // Book bounds: x between 25% and 75%, y between 22% and 78%
      let bx1 = width * 0.24, bx2 = width * 0.76;
      let by1 = height * 0.22, by2 = height * 0.78;
      
      let inBook = (x >= bx1 && x <= bx2 && y >= by1 && y <= by2);
      let inBookSpine = (x >= bx1 && x <= bx1 + size * 0.08 && y >= by1 && y <= by2);
      
      // Journal lines inside book (3 horizontal lines)
      let lineX1 = bx1 + size * 0.16;
      let lineX2 = bx2 - size * 0.12;
      let inLine1 = (x >= lineX1 && x <= lineX2 && Math.abs(y - (by1 + (by2 - by1) * 0.32)) <= Math.max(1, size * 0.025));
      let inLine2 = (x >= lineX1 && x <= lineX2 && Math.abs(y - (by1 + (by2 - by1) * 0.50)) <= Math.max(1, size * 0.025));
      let inLine3 = (x >= lineX1 && x <= lineX1 + (lineX2 - lineX1) * 0.6 && Math.abs(y - (by1 + (by2 - by1) * 0.68)) <= Math.max(1, size * 0.025));

      // Pen or sparkle indicator at bottom right
      let sparkCx = width * 0.76, sparkCy = height * 0.76;
      let sdist = Math.sqrt((x - sparkCx)**2 + (y - sparkCy)**2);
      let inSpark = sdist <= size * 0.18;

      if (inSpark) {
        // Bright emerald-gold highlight badge
        rawData.push(255, 215, 0, 255);
      } else if (inLine1 || inLine2 || inLine3) {
        // Subtle blue-gray lines
        rawData.push(100, 116, 139, 255);
      } else if (inBookSpine) {
        // Darker book spine
        rawData.push(226, 232, 240, 255);
      } else if (inBook) {
        // Clean white journal page
        rawData.push(255, 255, 255, 255);
      } else {
        // Background
        rawData.push(bgR, bgG, bgB, 255);
      }
    }
  }

  const rawBuffer = Buffer.from(rawData);
  const compressed = zlib.deflateSync(rawBuffer);

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach(size => {
  const png = createPng(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated: ${filePath} (${png.length} bytes)`);
});
