const MOJIBAKE_HINT = /[ÃÂØÙ]/;
const CP1252_TO_BYTE = new Map([
  [0x20AC, 0x80], // €
  [0x201A, 0x82], // ‚
  [0x0192, 0x83], // ƒ
  [0x201E, 0x84], // „
  [0x2026, 0x85], // …
  [0x2020, 0x86], // †
  [0x2021, 0x87], // ‡
  [0x02C6, 0x88], // ˆ
  [0x2030, 0x89], // ‰
  [0x0160, 0x8a], // Š
  [0x2039, 0x8b], // ‹
  [0x0152, 0x8c], // Œ
  [0x017D, 0x8e], // Ž
  [0x2018, 0x91], // ‘
  [0x2019, 0x92], // ’
  [0x201C, 0x93], // “
  [0x201D, 0x94], // ”
  [0x2022, 0x95], // •
  [0x2013, 0x96], // –
  [0x2014, 0x97], // —
  [0x02DC, 0x98], // ˜
  [0x2122, 0x99], // ™
  [0x0161, 0x9a], // š
  [0x203A, 0x9b], // ›
  [0x0153, 0x9c], // œ
  [0x017E, 0x9e], // ž
  [0x0178, 0x9f]  // Ÿ
]);

function toByte(codePoint) {
  if (codePoint <= 0xff) {
    return codePoint;
  }

  return CP1252_TO_BYTE.get(codePoint) ?? 0x3f;
}

function decodeLatin1AsUtf8(value) {
  const bytes = new Uint8Array(Array.from(value, (char) => toByte(char.codePointAt(0))));
  return new TextDecoder('utf-8').decode(bytes);
}

function countMojibakeHints(value) {
  const matches = value.match(/[ÃÂØÙ]/g);
  return matches ? matches.length : 0;
}

function hasUnexpectedControlChars(value) {
  for (const char of value) {
    const code = char.codePointAt(0);
    if ((code >= 0x00 && code <= 0x08) || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f)) {
      return true;
    }
  }

  return false;
}

export function repairMojibake(value) {
  if (typeof value !== 'string' || !value || !MOJIBAKE_HINT.test(value)) {
    return value;
  }

  let repaired = value;
  for (let i = 0; i < 3; i += 1) {
    if (!MOJIBAKE_HINT.test(repaired)) {
      break;
    }

    try {
      const hintScoreBefore = countMojibakeHints(repaired);
      const decoded = decodeLatin1AsUtf8(repaired);
      if (!decoded || decoded === repaired) {
        break;
      }
      if (decoded.includes('\uFFFD') || hasUnexpectedControlChars(decoded)) {
        break;
      }

      const hintScoreAfter = countMojibakeHints(decoded);
      if (hintScoreAfter > hintScoreBefore) {
        break;
      }
      if (hintScoreAfter === hintScoreBefore) {
        break;
      }

      repaired = decoded;
    } catch {
      break;
    }
  }

  return repaired;
}
