const fs = require("fs");
const path = require("path");

function createPNG(width, height, r, g, b) {
  const rowSize = width * 4;
  const rawDataSize = rowSize * height;
  const rawData = Buffer.alloc(rawDataSize);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * rowSize + x * 4;
      const cx = x - width / 2;
      const cy = y - height / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const radius = Math.min(width, height) / 2 - 4;

      if (dist <= radius) {
        rawData[i] = r;
        rawData[i + 1] = g;
        rawData[i + 2] = b;
        rawData[i + 3] = 255;
      } else {
        rawData[i + 3] = 0;
      }
    }
  }

  function adler32(buf) {
    let a = 1, b2 = 0;
    for (let i = 0; i < buf.length; i++) { a = (a + buf[i]) % 65521; b2 = (b2 + a) % 65521; }
    return (b2 << 16) | a;
  }

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xEDB88320 ^ (v >>> 1) : v >>> 1;
      table[n] = v;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
  }

  const zlib = require("zlib");
  const deflated = zlib.deflateSync(rawData);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = makeChunk("IHDR", ihdrData);
  const idat = makeChunk("IDAT", deflated);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([pngSig, ihdr, idat, iend]);
}

const assetsDir = path.join(__dirname, "assets");
fs.mkdirSync(assetsDir, { recursive: true });

// Icon - 1024x1024 dark blue
fs.writeFileSync(path.join(assetsDir, "icon.png"), createPNG(1024, 1024, 30, 86, 219));
console.log("Created icon.png (1024x1024)");

// Adaptive icon foreground - 1024x1024
fs.writeFileSync(path.join(assetsDir, "adaptive-icon.png"), createPNG(1024, 1024, 30, 86, 219));
console.log("Created adaptive-icon.png (1024x1024)");

// Splash - 1284x2778 (iPhone 14 Pro Max)
fs.writeFileSync(path.join(assetsDir, "splash.png"), createPNG(1284, 2778, 30, 86, 219));
console.log("Created splash.png (1284x2778)");

// Favicon - 48x48
fs.writeFileSync(path.join(assetsDir, "favicon.png"), createPNG(48, 48, 30, 86, 219));
console.log("Created favicon.png (48x48)");
