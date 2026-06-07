/**
 * Compare production bundle size and main-thread simulation time against
 * committed baselines. Fails when any metric regresses more than 15%.
 *
 * Usage:
 *   npm run build:renderer && npm run perf:budget
 *   npm run perf:baseline   # refresh scripts/performance-baseline.json
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(__dirname, 'performance-baseline.json');
const SIM_MEASURE_PATH = path.join(__dirname, '.sim-measure.json');
const REGRESSION_RATIO = 1.15;

const METRICS = [
  { key: 'totalJsBytes', label: 'Total JS (raw)', unit: 'bytes' },
  { key: 'totalJsGzipBytes', label: 'Total JS (gzip)', unit: 'bytes' },
  { key: 'simulateStressMs', label: 'Simulate stress (median)', unit: 'ms' },
];

function measureBundle(distDir = path.join(ROOT, 'dist')) {
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.error(
      'dist/assets not found. Run `npm run build:renderer` before perf:budget.'
    );
    process.exit(1);
  }

  const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
  let totalJsBytes = 0;
  let totalJsGzipBytes = 0;
  for (const file of files) {
    const buf = fs.readFileSync(path.join(assetsDir, file));
    totalJsBytes += buf.length;
    totalJsGzipBytes += gzipSync(buf).length;
  }

  return {
    totalJsBytes,
    totalJsGzipBytes,
    jsFileCount: files.length,
  };
}

function measureSimulation() {
  try {
    fs.unlinkSync(SIM_MEASURE_PATH);
  } catch {
    // ignore
  }

  execSync(
    'npx vitest run --config vitest.perf.config.ts src/benchmarks/__tests__/performanceBudget.perf.test.ts',
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, PERF_OUTPUT: SIM_MEASURE_PATH },
    }
  );

  const raw = fs.readFileSync(SIM_MEASURE_PATH, 'utf8');
  try {
    fs.unlinkSync(SIM_MEASURE_PATH);
  } catch {
    // ignore
  }

  const parsed = JSON.parse(raw);
  if (typeof parsed.simulateStressMs !== 'number') {
    throw new Error('Simulation benchmark did not write simulateStressMs');
  }
  return parsed.simulateStressMs;
}

function roundMetric(key, value) {
  if (key === 'simulateStressMs') return Math.round(value * 100) / 100;
  return Math.round(value);
}

function formatValue(key, value) {
  if (key === 'simulateStressMs') return `${value.toFixed(2)} ms`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} MB`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} kB`;
  return `${value} B`;
}

function compareMetrics(current, baseline) {
  const rows = [];
  let failed = false;

  for (const { key, label } of METRICS) {
    const base = baseline[key];
    const cur = current[key];
    if (typeof base !== 'number' || typeof cur !== 'number') {
      console.error(`Missing metric ${key} in baseline or current measurement`);
      process.exit(1);
    }

    const limit = base * REGRESSION_RATIO;
    const ok = cur <= limit;
    if (!ok) failed = true;
    const deltaPct = ((cur / base - 1) * 100).toFixed(1);

    rows.push({
      label,
      ok,
      current: formatValue(key, cur),
      baseline: formatValue(key, base),
      limit: formatValue(key, limit),
      deltaPct,
    });
  }

  return { rows, failed };
}

function writeBaseline(measurements) {
  const payload = {
    updatedAt: new Date().toISOString().slice(0, 10),
    stressComponentCount: 200,
    regressionThresholdPercent: 15,
    ...Object.fromEntries(
      METRICS.map(({ key }) => [key, roundMetric(key, measurements[key])])
    ),
    jsFileCount: measurements.jsFileCount,
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Wrote ${path.relative(ROOT, BASELINE_PATH)}`);
}

async function main() {
  const updateBaseline = process.argv.includes('--update-baseline');

  if (!updateBaseline && !fs.existsSync(BASELINE_PATH)) {
    console.error(
      `Baseline missing at ${path.relative(ROOT, BASELINE_PATH)}. Run npm run perf:baseline first.`
    );
    process.exit(1);
  }

  const bundle = measureBundle();
  const simulateStressMs = measureSimulation();
  const current = {
    totalJsBytes: bundle.totalJsBytes,
    totalJsGzipBytes: bundle.totalJsGzipBytes,
    simulateStressMs,
    jsFileCount: bundle.jsFileCount,
  };

  if (updateBaseline) {
    writeBaseline(current);
    console.log('Performance baseline updated:');
    for (const { key, label } of METRICS) {
      console.log(`  ${label}: ${formatValue(key, current[key])}`);
    }
    console.log(`  JS files: ${current.jsFileCount}`);
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const { rows, failed } = compareMetrics(current, baseline);

  console.log('Performance budget check (max +15% vs baseline):\n');
  for (const row of rows) {
    const status = row.ok ? 'OK' : 'FAIL';
    console.log(
      `[${status}] ${row.label}\n` +
        `       current: ${row.current}  baseline: ${row.baseline}  limit: ${row.limit}  (${row.deltaPct}%)\n`
    );
  }

  if (failed) {
    console.error(
      'Performance regression detected. If intentional, run `npm run perf:baseline` and commit the updated baseline.'
    );
    process.exit(1);
  }

  console.log('All performance metrics within budget.');
}

await main();
