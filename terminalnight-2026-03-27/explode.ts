// Explode text animation for terminal
// Phase 1: characters burst outward from center
// Phase 2: characters converge back to form text
// Phase 3: vertical gradient scroll loop until keypress
// Usage: echo "Your Text Here" | deno run --allow-read=/dev/tty explode.ts

const ESC = "\x1b";
const CSI = `${ESC}[`;

const moveTo = (row: number, col: number) => `${CSI}${row + 1};${col + 1}H`;
const hideCursor = `${CSI}?25l`;
const showCursor = `${CSI}?25h`;
const clearScreen = `${CSI}2J`;

interface Particle {
  char: string;
  targetRow: number;
  targetCol: number;
  // Explosion vector (direction + speed from center)
  angle: number;
  speed: number;
  // Peak position after explosion
  peakRow: number;
  peakCol: number;
  delay: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInQuad(t: number): number {
  return t * t;
}

function getTerminalSize(): { rows: number; cols: number } {
  try {
    const { rows, columns: cols } = Deno.consoleSize();
    return { rows, cols };
  } catch {
    return { rows: 24, cols: 80 };
  }
}

async function readStdin(): Promise<string | null> {
  if (Deno.stdin.isTerminal()) return null;
  const buf = new Uint8Array(10240);
  const n = await Deno.stdin.read(buf);
  if (n === null) return null;
  return new TextDecoder().decode(buf.subarray(0, n)).trimEnd();
}

function charWidth(code: number): number {
  if (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe6f) ||
    (code >= 0xff01 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x20000 && code <= 0x2fa1f) ||
    (code >= 0x1f000 && code <= 0x1faff)
  ) {
    return 2;
  }
  return 1;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgb(r: number, g: number, b: number): string {
  return `${CSI}38;2;${r};${g};${b}m`;
}

async function main() {
  const input = await readStdin();
  if (!input) {
    console.error(
      'Usage: echo "text" | deno run --allow-read=/dev/tty explode.ts',
    );
    Deno.exit(1);
  }

  const { rows, cols } = getTerminalSize();
  const lines = input.split("\n");
  const particles: Particle[] = [];

  const centerRow = Math.floor(rows / 2);
  const centerCol = Math.floor(cols / 2);

  // Center text on screen
  const textHeight = lines.length;
  const startRow = Math.floor((rows - textHeight) / 2);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    let displayWidth = 0;
    for (const ch of line) {
      displayWidth += charWidth(ch.codePointAt(0) ?? 0);
    }
    const startCol = Math.floor((cols - displayWidth) / 2);

    let colOffset = 0;
    for (const ch of line) {
      const w = charWidth(ch.codePointAt(0) ?? 0);
      if (ch !== " ") {
        // Random explosion direction and speed
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 1.0;

        // Calculate peak position (mix of near and far)
        const explodeDistance = 8 + Math.random() * 30;
        const peakRow = centerRow + Math.sin(angle) * explodeDistance;
        const peakCol = centerCol + Math.cos(angle) * explodeDistance * 2;

        particles.push({
          char: ch,
          targetRow: startRow + lineIdx,
          targetCol: startCol + colOffset,
          angle,
          speed,
          peakRow,
          peakCol,
          delay: Math.floor(Math.random() * 8),
        });
      }
      colOffset += w;
    }
  }

  const encoder = new TextEncoder();
  const write = (s: string) => Deno.stdout.writeSync(encoder.encode(s));

  const tty = await Deno.open("/dev/tty", { read: true });
  tty.setRaw(true);

  const cleanup = () => {
    try { tty.setRaw(false); } catch { /* */ }
    try { tty.close(); } catch { /* */ }
    write(`${CSI}0m` + showCursor);
  };

  Deno.addSignalListener("SIGINT", () => {
    cleanup();
    write(clearScreen + moveTo(0, 0));
    Deno.exit(0);
  });

  write(hideCursor + clearScreen);

  // ── Phase 1+2: Explode outward, then converge back ──
  // Single timeline: 0..peakT = explode out, peakT..1 = converge to target
  const totalFrames = 70;
  const peakT = 0.3; // 30% of timeline for explosion, 70% for return

  for (let frame = 0; frame < totalFrames; frame++) {
    let buf = clearScreen;

    for (const p of particles) {
      const activeFrame = frame - p.delay;
      if (activeFrame < 0) {
        buf += moveTo(centerRow, centerCol) + `${CSI}38;5;255m` + p.char;
        continue;
      }

      const globalT = Math.min(activeFrame / (totalFrames - 10), 1);

      let drawRow: number, drawCol: number;
      let brightness: number;

      if (globalT < peakT) {
        // Exploding outward: center → peak
        const t = easeInQuad(globalT / peakT);
        drawRow = lerp(centerRow, p.peakRow, t);
        drawCol = lerp(centerCol, p.peakCol, t);
        brightness = Math.max(235, 255 - Math.floor(t * 18));
      } else {
        // Converging back: peak → target
        const t = easeOutCubic((globalT - peakT) / (1 - peakT));
        drawRow = lerp(p.peakRow, p.targetRow, t);
        drawCol = lerp(p.peakCol, p.targetCol, t);
        brightness = Math.min(255, 235 + Math.floor(t * 20));
      }

      const r = Math.round(drawRow);
      const c = Math.round(drawCol);

      if (r < 0 || r >= rows || c < 0 || c >= cols - 1) continue;

      buf += moveTo(r, c) + `${CSI}38;5;${brightness}m` + p.char;
    }

    write(buf);
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  // ── Phase 3: Vertical gradient scroll loop until keypress ──
  let keyPressed = false;
  const keyBuf = new Uint8Array(16);
  const pollKey = async () => {
    try {
      const n = await tty.read(keyBuf);
      if (n !== null) keyPressed = true;
    } catch { /* */ }
  };
  pollKey();

  let tick = 0;
  while (!keyPressed) {
    let buf = clearScreen;

    for (const p of particles) {
      const hue = ((p.targetRow * 30) + tick * 4) % 360;
      const [cr, cg, cb] = hslToRgb(hue, 0.7, 0.65);
      buf += moveTo(p.targetRow, p.targetCol) + rgb(cr, cg, cb) + p.char;
    }

    write(buf);
    tick++;
    await new Promise((r) => setTimeout(r, 50));

    if (!keyPressed) pollKey();
  }

  write(`${CSI}0m` + clearScreen + moveTo(0, 0));
  cleanup();
  Deno.exit(0);
}

main();
