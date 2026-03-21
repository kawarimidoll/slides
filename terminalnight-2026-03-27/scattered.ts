// Scattered text animation for terminal
// Phase 1: characters drift randomly (waiting for keypress)
// Phase 2: characters converge to form text with gradient finish
// Usage: echo "Your Text Here" | deno run --allow-read=/dev/tty scattered.ts

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
  // Phase 1: drifting state
  posRow: number;
  posCol: number;
  velRow: number;
  velCol: number;
  // Phase 2: converge from snapshot position
  snapRow: number;
  snapCol: number;
  delay: number;
  // For final gradient
  gradientColor: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
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

// HSL to RGB for gradient
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
    console.error("Usage: echo \"text\" | deno run --allow-read=/dev/tty scattered.ts");
    Deno.exit(1);
  }

  const { rows, cols } = getTerminalSize();
  const lines = input.split("\n");
  const particles: Particle[] = [];

  // Center text on screen
  const textHeight = lines.length;
  const startRow = Math.floor((rows - textHeight) / 2);

  // Calculate total display width for gradient
  let totalWidth = 0;
  for (const line of lines) {
    let w = 0;
    for (const ch of line) w += charWidth(ch.codePointAt(0) ?? 0);
    totalWidth = Math.max(totalWidth, w);
  }

  // Track column position across all characters for gradient
  let globalCharIdx = 0;
  const totalChars = [...input.replace(/\s/g, "")].length;

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
        // Gradient: hue shifts across characters (e.g. cyan -> magenta)
        const ratio = totalChars > 1 ? globalCharIdx / (totalChars - 1) : 0;
        const hue = 180 + ratio * 140; // cyan(180) -> purple(320)
        const [r, g, b] = hslToRgb(hue % 360, 0.7, 0.65);

        const randRow = Math.random() * (rows - 1);
        const randCol = Math.random() * (cols - w);

        particles.push({
          char: ch,
          targetRow: startRow + lineIdx,
          targetCol: startCol + colOffset,
          posRow: randRow,
          posCol: randCol,
          // Random velocity for drifting phase
          velRow: (Math.random() - 0.5) * 0.6,
          velCol: (Math.random() - 0.5) * 1.0,
          snapRow: 0,
          snapCol: 0,
          delay: Math.floor(Math.random() * 15),
          gradientColor: rgb(r, g, b),
        });
        globalCharIdx++;
      }
      colOffset += w;
    }
  }

  const encoder = new TextEncoder();
  const write = (s: string) => Deno.stdout.writeSync(encoder.encode(s));

  // Open /dev/tty for key input (works even when stdin is piped)
  const tty = await Deno.open("/dev/tty", { read: true });
  tty.setRaw(true);

  const cleanup = () => {
    try { tty.setRaw(false); } catch { /* already closed */ }
    try { tty.close(); } catch { /* already closed */ }
    write(`${CSI}0m` + showCursor);
  };

  Deno.addSignalListener("SIGINT", () => {
    cleanup();
    write(clearScreen + moveTo(0, 0));
    Deno.exit(0);
  });

  write(hideCursor + clearScreen);

  // Dim color for drifting phase
  const dimColor = `${CSI}38;5;240m`;

  // ── Phase 1: Drift randomly until keypress ──
  let keyPressed = false;

  // Non-blocking key listener via /dev/tty
  const keyBuf = new Uint8Array(16);
  const pollKey = async () => {
    try {
      const n = await tty.read(keyBuf);
      if (n !== null) keyPressed = true;
    } catch { /* ignore */ }
  };

  // Start listening for keypress
  let keyPromise = pollKey();

  while (!keyPressed) {
    let buf = clearScreen;

    for (const p of particles) {
      // Update position with velocity
      p.posRow += p.velRow;
      p.posCol += p.velCol;

      // Bounce off walls
      if (p.posRow <= 0 || p.posRow >= rows - 1) {
        p.velRow *= -1;
        p.posRow = Math.max(0, Math.min(rows - 1, p.posRow));
      }
      if (p.posCol <= 0 || p.posCol >= cols - 2) {
        p.velCol *= -1;
        p.posCol = Math.max(0, Math.min(cols - 2, p.posCol));
      }

      const drawRow = Math.max(0, Math.min(rows - 1, Math.round(p.posRow)));
      const drawCol = Math.max(0, Math.min(cols - 2, Math.round(p.posCol)));

      buf += moveTo(drawRow, drawCol) + dimColor + p.char;
    }

    write(buf);
    await new Promise((r) => setTimeout(r, 50)); // ~20fps for drift

    // Check if key was pressed
    if (!keyPressed) {
      keyPromise = pollKey();
    }
  }

  // ── Phase 2: Converge to target positions ──

  // Snapshot current positions as starting points for convergence
  for (const p of particles) {
    p.snapRow = p.posRow;
    p.snapCol = p.posCol;
  }

  // Brightness steps for converge animation
  const colorSteps = [
    `${CSI}38;5;240m`,
    `${CSI}38;5;244m`,
    `${CSI}38;5;248m`,
    `${CSI}38;5;252m`,
    `${CSI}0m`,
  ];

  const convergeFrames = 50;

  for (let frame = 0; frame < convergeFrames; frame++) {
    let buf = clearScreen;

    for (const p of particles) {
      const activeFrame = frame - p.delay;
      const moveDuration = convergeFrames - 18;

      let t: number;
      if (activeFrame < 0) {
        t = 0;
      } else {
        t = Math.min(activeFrame / moveDuration, 1);
      }

      const eased = easeOutCubic(t);

      const drawRow = Math.round(lerp(p.snapRow, p.targetRow, eased));
      const drawCol = Math.round(lerp(p.snapCol, p.targetCol, eased));

      const safeRow = Math.max(0, Math.min(rows - 1, drawRow));
      const safeCol = Math.max(0, Math.min(cols - 2, drawCol));

      const colorIdx = Math.min(
        Math.floor(eased * (colorSteps.length - 1)),
        colorSteps.length - 1,
      );

      buf += moveTo(safeRow, safeCol) + colorSteps[colorIdx] + p.char;
    }

    write(buf);
    await new Promise((r) => setTimeout(r, 33)); // ~30fps
  }

  // ── Phase 3: Vertical gradient scroll loop until keypress ──
  keyPressed = false;
  const pollKey2 = async () => {
    try {
      const n = await tty.read(keyBuf);
      if (n !== null) keyPressed = true;
    } catch { /* ignore */ }
  };
  pollKey2();

  let tick = 0;
  while (!keyPressed) {
    let buf = clearScreen;

    for (const p of particles) {
      // Hue scrolls vertically based on row + time
      const hue = ((p.targetRow * 30) + tick * 4) % 360;
      const [cr, cg, cb] = hslToRgb(hue, 0.7, 0.65);
      buf += moveTo(p.targetRow, p.targetCol) + rgb(cr, cg, cb) + p.char;
    }

    write(buf);
    tick++;
    await new Promise((r) => setTimeout(r, 50));

    if (!keyPressed) pollKey2();
  }

  // Final clean render
  write(`${CSI}0m` + clearScreen + moveTo(0, 0));
  cleanup();
  Deno.exit(0);
}

main();
