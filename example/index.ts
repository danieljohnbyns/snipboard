import { promises as fs } from 'node:fs';
import path from 'node:path';

import upload from '..';

const sampleImagePath = path.join(process.cwd(), 'example', 'sample.png');
const sampleImage = await fs.readFile(sampleImagePath);
const file = new File([sampleImage], 'sample.png', { type: 'image/png' });

const url = await upload(file);
console.log(url);
