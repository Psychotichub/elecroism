/**
 * Writes public/audio/mcb-trip.wav — short mono PCM trip-like transient for the app.
 * Regenerate: node scripts/write-mcb-trip-wav.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const sampleRate = 44100;
const duration = 0.32;
const numChannels = 1;
const bitsPerSample = 16;
const numSamples = Math.floor(sampleRate * duration);
const blockAlign = (numChannels * bitsPerSample) / 8;
const byteRate = sampleRate * blockAlign;
const dataSize = numSamples * blockAlign;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(bitsPerSample, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

let o = 44;
let brown = 0;
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const snap1 = Math.min(1, t / 0.0022) * Math.exp(-t * 52) * 0.88;
  const snap2 =
    Math.min(1, Math.max(0, t - 0.013) / 0.0018) * Math.exp(-(t - 0.013) * 42) * 0.34;
  const w = (Math.random() * 2 - 1) * 0.55;
  brown = (brown + w * 0.13) * 0.964;
  const noise = brown * (snap1 + snap2);
  const th =
    Math.sin(2 * Math.PI * 78 * t) * Math.exp(-t * 11) * 0.38 * Math.min(1, t / 0.0045);
  let s = noise + th;
  s = Math.max(-1, Math.min(1, s));
  buffer.writeInt16LE(Math.round(s * 30000), o);
  o += 2;
}

const dir = path.join(root, 'public', 'audio');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, 'mcb-trip.wav');
fs.writeFileSync(out, buffer);
console.log('Wrote', out, `(${(buffer.length / 1024).toFixed(1)} KiB)`);
