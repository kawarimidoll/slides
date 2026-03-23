// Rain text animation for terminal
// Random characters rain down, then fade to reveal target text
// Usage: echo "Your Text Here" | deno run --allow-read=/dev/tty rain.ts

const ESC = "\x1b";
const CSI = `${ESC}[`;

const moveTo = (row: number, col: number) => `${CSI}${row + 1};${col + 1}H`;
const hideCursor = `${CSI}?25l`;
const showCursor = `${CSI}?25h`;
const clearScreen = `${CSI}2J`;

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

const RAIN_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789!@#$%&*+=<>?/\\|~^";
function randomChar(): string {
  return RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
}

interface TargetChar {
  char: string;
  row: number;
  col: number;
}

async function main() {
  const input = await readStdin();
  if (!input) {
    console.error(
      'Usage: echo "text" | deno run --allow-read=/dev/tty rain.ts',
    );
    Deno.exit(1);
  }

  const { rows, cols } = getTerminalSize();
  const lines = input.split("\n");
  const targets: TargetChar[] = [];

  // Build target character positions (centered)
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
        targets.push({
          char: ch,
          row: startRow + lineIdx,
          col: startCol + colOffset,
        });
      }
      colOffset += w;
    }
  }

  // Target position lookup: "row,col" -> char
  const targetMap = new Map<string, string>();
  for (const t of targets) {
    targetMap.set(`${t.row},${t.col}`, t.char);
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

  // ── Phase 1: Column rain — long vertical lines with random start ──
  // Each column is one rain streak that falls once.
  // Streaks are long enough to fill most of the screen.
  // Target chars are locked as the streak tail passes through.

  interface Column {
    col: number;
    headRow: number; // current head position
    speed: number;
    length: number; // streak length
    startDelay: number; // frames before this column starts
    chars: string[]; // pre-generated random chars per row
  }

  const columns: Column[] = [];
  for (let c = 0; c < cols; c++) {
    columns.push({
      col: c,
      headRow: -1,
      speed: 0.8 + Math.random() * 0.8,
      length: rows + Math.floor(Math.random() * Math.floor(rows * 0.5)),
      startDelay: Math.floor(Math.random() * 20),
      chars: Array.from({ length: rows }, () => randomChar()),
    });
  }

  const locked = new Set<string>();

  // Run until all columns have fully passed through
  const maxFrames = 120;
  for (let frame = 0; frame < maxFrames; frame++) {
    let buf = clearScreen;

    let allDone = true;

    for (const col of columns) {
      if (frame < col.startDelay) {
        allDone = false;
        continue;
      }

      col.headRow += col.speed;
      const head = Math.floor(col.headRow);
      const tail = head - col.length;

      // Column still active?
      if (tail < rows) allDone = false;

      // Lock targets when the head reaches them (not the tail)
      for (const t of targets) {
        if (t.col === col.col && head >= t.row) {
          locked.add(`${t.row},${t.col}`);
        }
      }

      for (let r = 0; r < rows; r++) {
        if (r > head || r <= tail) continue;
        if (r < 0 || r >= rows) continue;

        const key = `${r},${col.col}`;

        // Don't overwrite locked targets with rain chars
        if (locked.has(key)) continue;

        // Brightness: head is bright, fades toward tail
        const distFromHead = head - r;
        const ratio = distFromHead / col.length;
        const gray = Math.max(234, Math.floor(254 - ratio * 22));

        buf += moveTo(r, col.col) + `${CSI}38;5;${gray}m` + col.chars[r];
      }
    }

    // Always draw all locked targets
    for (const key of locked) {
      const [r, c] = key.split(",").map(Number);
      buf += moveTo(r, c) + `${CSI}38;5;255m` + targetMap.get(key)!;
    }

    write(buf);
    await new Promise((resolve) => setTimeout(resolve, 25));

    if (allDone) break;
  }

  // Lock any remaining
  for (const t of targets) {
    locked.add(`${t.row},${t.col}`);
  }

  // Brief pause with just target text
  {
    let buf = clearScreen;
    for (const t of targets) {
      buf += moveTo(t.row, t.col) + `${CSI}38;5;255m` + t.char;
    }
    write(buf);
    await new Promise((r) => setTimeout(r, 300));
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

    for (const t of targets) {
      const hue = ((t.row * 30) + tick * 4) % 360;
      const [cr, cg, cb] = hslToRgb(hue, 0.7, 0.65);
      buf += moveTo(t.row, t.col) + rgb(cr, cg, cb) + t.char;
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
