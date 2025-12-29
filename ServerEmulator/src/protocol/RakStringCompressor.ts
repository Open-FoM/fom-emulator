import RakBitStream from '../raknet-js/structures/BitStream';
import * as fs from 'fs';
import * as path from 'path';

type HuffmanCode = {
  bits: number[];
  bitLength: number;
};

type HuffmanNode = {
  symbol: number | null;
  weight: number;
  left?: HuffmanNode;
  right?: HuffmanNode;
  parent?: HuffmanNode;
};

const HUFFMAN_FREQUENCIES: number[] = [
  0,0,0,0,0,0,0,0,0,0,722,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  11084,58,63,1,0,31,0,317,64,64,44,0,695,62,980,266,69,67,56,7,73,3,14,2,69,1,167,9,1,2,25,94,
  0,195,139,34,96,48,103,56,125,653,21,5,23,64,85,44,34,7,92,76,147,12,14,57,15,39,15,1,1,1,2,3,
  0,3611,845,1077,1884,5870,841,1057,2501,3212,164,531,2019,1330,3056,4037,848,47,2586,2919,4771,1707,535,1106,152,1243,100,0,2,0,10,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
];

let cachedCodes: HuffmanCode[] | null = null;
let cachedDecodeTree: HuffmanNode | null = null;

function loadRuntimeCodes(): HuffmanCode[] | null {
  const tablePath = process.env.FOM_HUFFMAN_TABLE
    ? path.resolve(process.env.FOM_HUFFMAN_TABLE)
    : path.resolve(__dirname, '..', '..', '..', 'Docs', 'Notes', 'huffman_table_runtime.json');

  if (!fs.existsSync(tablePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(tablePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 256) {
      return null;
    }

    const codes: HuffmanCode[] = new Array(256);
    for (const entry of parsed) {
      if (!entry || typeof entry.sym !== 'number') {
        return null;
      }
      const sym = entry.sym & 0xff;
      const bitlen = typeof entry.bitlen === 'number'
        ? entry.bitlen
        : (typeof entry.bitLength === 'number' ? entry.bitLength : undefined);
      const bitstr = typeof entry.bits === 'string' ? entry.bits : '';
      const bits: number[] = [];
      for (let i = 0; i < bitstr.length; i += 1) {
        bits.push(bitstr[i] === '1' ? 1 : 0);
      }
      const length = typeof bitlen === 'number' ? bitlen : bits.length;
      codes[sym] = { bits: bits.slice(0, length), bitLength: length };
    }
    return codes;
  } catch {
    return null;
  }
}

function insertSorted(queue: HuffmanNode[], node: HuffmanNode): void {
  let idx = 0;
  while (idx < queue.length && queue[idx].weight < node.weight) {
    idx += 1;
  }
  queue.splice(idx, 0, node);
}

function buildCodes(): HuffmanCode[] {
  const queue: HuffmanNode[] = [];
  const leaves: HuffmanNode[] = [];

  for (let i = 0; i < 256; i += 1) {
    const weight = HUFFMAN_FREQUENCIES[i] === 0 ? 1 : HUFFMAN_FREQUENCIES[i];
    const node: HuffmanNode = { symbol: i, weight };
    leaves.push(node);
    insertSorted(queue, node);
  }

  while (queue.length > 1) {
    const left = queue.shift() as HuffmanNode;
    const right = queue.shift() as HuffmanNode;
    const parent: HuffmanNode = {
      symbol: null,
      weight: left.weight + right.weight,
      left,
      right
    };
    left.parent = parent;
    right.parent = parent;
    insertSorted(queue, parent);
  }

  const codes: HuffmanCode[] = new Array(256);
  for (const leaf of leaves) {
    const bits: number[] = [];
    let node: HuffmanNode | undefined = leaf;
    while (node && node.parent) {
      bits.push(node.parent.left === node ? 0 : 1);
      node = node.parent;
    }
    bits.reverse();
    codes[leaf.symbol as number] = { bits, bitLength: bits.length };
  }

  return codes;
}

function getCodes(): HuffmanCode[] {
  if (!cachedCodes) {
    cachedCodes = loadRuntimeCodes() ?? buildCodes();
  }
  return cachedCodes;
}

function buildDecodeTree(): HuffmanNode {
  const root: HuffmanNode = { symbol: null, weight: 0 };
  const codes = getCodes();
  for (let sym = 0; sym < codes.length; sym += 1) {
    const code = codes[sym];
    if (!code || code.bitLength <= 0) {
      continue;
    }
    let node = root;
    for (let i = 0; i < code.bitLength; i += 1) {
      const bit = code.bits[i] ? 1 : 0;
      if (bit === 0) {
        if (!node.left) node.left = { symbol: null, weight: 0, parent: node };
        node = node.left;
      } else {
        if (!node.right) node.right = { symbol: null, weight: 0, parent: node };
        node = node.right;
      }
    }
    node.symbol = sym;
  }
  return root;
}

function getDecodeTree(): HuffmanNode {
  if (!cachedDecodeTree) {
    cachedDecodeTree = buildDecodeTree();
  }
  return cachedDecodeTree;
}

function writeCode(stream: RakBitStream, code: HuffmanCode, bitLimit?: number): void {
  const limit = bitLimit ?? code.bitLength;
  for (let i = 0; i < limit; i += 1) {
    stream.writeBit(code.bits[i] === 1);
  }
}

function encodeStringToBitStream(value: string, maxLen: number): RakBitStream {
  const codes = getCodes();
  const temp = new RakBitStream();

  let trimmed = value ?? '';
  if (maxLen > 0 && trimmed.length >= maxLen) {
    trimmed = trimmed.slice(0, Math.max(0, maxLen - 1));
  }

  for (let i = 0; i < trimmed.length; i += 1) {
    const codePoint = trimmed.charCodeAt(i) & 0xff;
    const code = codes[codePoint];
    writeCode(temp, code);
  }

  let bitCount = temp.bits();
  const pad = bitCount % 8;
  if (pad !== 0) {
    const padBits = 8 - pad;
    for (let i = 0; i < 256; i += 1) {
      const code = codes[i];
      if (code.bitLength > padBits) {
        writeCode(temp, code, padBits);
        break;
      }
    }
  }

  return temp;
}

export function writeCompressedString(stream: RakBitStream, value: string, maxLen: number = 2048): void {
  const temp = encodeStringToBitStream(value ?? '', maxLen);
  const bitCount = temp.bits();
  stream.writeCompressed(bitCount, 4);
  if (bitCount === 0) return;
  temp.resetRead();
  stream.writeBitStream(temp);
}

export function readCompressedString(stream: RakBitStream, maxLen: number = 2048): string {
  const countStream = stream.readCompressed(4);
  const bitCount = countStream.readLong();
  if (bitCount <= 0) return '';

  const root = getDecodeTree();
  let node: HuffmanNode | undefined = root;
  const out: number[] = [];

  for (let i = 0; i < bitCount; i += 1) {
    const bit = stream.readBit();
    node = bit ? node?.right : node?.left;
    if (!node) {
      throw new Error('Huffman decode failed: invalid prefix');
    }
    if (node.symbol !== null && node.symbol !== undefined) {
      if (maxLen <= 0 || out.length < maxLen) {
        out.push(node.symbol & 0xff);
      }
      node = root;
    }
  }

  return Buffer.from(out).toString('latin1');
}
