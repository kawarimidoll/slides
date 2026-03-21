// Vortex text animation for terminal
// Characters spiral inward from outside the screen to form text
// Usage: echo "Your Text Here" | deno run --allow-read=/dev/tty vortex.ts

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
  // Spiral parameters
  startAngle: number;
  startRadius: number;
  delay: number;
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
      'Usage: echo "text" | deno run --allow-read=/dev/tty vortex.ts',
    );
    Deno.exit(1);
  }

  const { rows, cols } = getTerminalSize();
  const lines = input.split("\n");
  const particles: Particle[] = [];

  const centerRow = Math.floor(rows / 2);
  const centerCol = Math.floor(cols / 2);

  // Diagonal of terminal = max radius needed to start off-screen
  const maxRadius = Math.sqrt(rows * rows + cols * cols);

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
        particles.push({
          char: ch,
          targetRow: startRow + lineIdx,
          targetCol: startCol + colOffset,
          startAngle: Math.random() * Math.PI * 2,
          startRadius: maxRadius * (0.7 + Math.random() * 0.5),
          delay: Math.floor(Math.random() * 12),
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

  // ── Phase 1: Spiral inward to target positions ──
  const totalFrames = 70;
  // Total rotation during spiral (radians)
  const spiralRotation = Math.PI * 3; // 1.5 full turns

  for (let frame = 0; frame < totalFrames; frame++) {
    let buf = clearScreen;

    for (const p of particles) {
      const activeFrame = frame - p.delay;
      if (activeFrame < 0) continue; // not yet visible

      const t = Math.min(activeFrame / (totalFrames - 15), 1);
      const eased = easeOutCubic(t);

      // Radius shrinks from startRadius to 0
      const radius = p.startRadius * (1 - eased);

      // Angle rotates as it spirals in
      const angle = p.startAngle + spiralRotation * eased;

      // Spiral position relative to target (not center)
      // As t→1, radius→0, so position converges to target
      const drawRow = Math.round(
        p.targetRow + Math.sin(angle) * radius,
      );
      const drawCol = Math.round(
        p.targetCol + Math.cos(angle) * radius * 2, // aspect ratio
      );

      if (drawRow < 0 || drawRow >= rows || drawCol < 0 || drawCol >= cols - 1) {
        continue;
      }

      const brightness = Math.min(255, 232 + Math.floor(eased * 23));
      buf += moveTo(drawRow, drawCol) + `${CSI}38;5;${brightness}m` + p.char;
    }

    write(buf);
    await new Promise((r) => setTimeout(r, 30));
  }

  // ── Phase 2: Vertical gradient scroll loop until keypress ──
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
