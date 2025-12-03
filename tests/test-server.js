/**
 * Automated Test Server
 * 
 * A local server that runs all tests and provides a web interface for results.
 * Start with: npm run test:server
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

let currentSuite = {
  id: '',
  results: [],
  status: 'idle',
};

// Run a command and capture output
function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });

    proc.on('error', (err) => {
      resolve({ stdout, stderr: err.message, exitCode: 1 });
    });
  });
}

// Run Jest unit tests
async function runUnitTests() {
  const result = {
    name: 'Unit Tests (Jest)',
    type: 'unit',
    status: 'running',
    timestamp: new Date().toISOString(),
  };

  const startTime = Date.now();

  try {
    const { stdout, stderr, exitCode } = await runCommand(
      'npx',
      ['jest', '--json', '--testPathPattern=unit'],
      process.cwd()
    );

    result.duration = Date.now() - startTime;
    result.output = stdout + stderr;
    result.status = exitCode === 0 ? 'passed' : 'failed';

    // Parse Jest JSON output if available
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*"numPassedTests"[\s\S]*\}/);
      if (jsonMatch) {
        const jestResult = JSON.parse(jsonMatch[0]);
        result.output = `Passed: ${jestResult.numPassedTests}, Failed: ${jestResult.numFailedTests}, Total: ${jestResult.numTotalTests}`;
        if (jestResult.numFailedTests > 0) {
          result.errors = jestResult.testResults
            .filter((t) => t.status === 'failed')
            .map((t) => t.name);
        }
      }
    } catch {
      // Keep raw output if JSON parsing fails
    }
  } catch (error) {
    result.status = 'failed';
    result.errors = [error.message];
    result.duration = Date.now() - startTime;
  }

  return result;
}

// Run Playwright E2E tests
async function runE2ETests() {
  const result = {
    name: 'E2E Tests (Playwright)',
    type: 'e2e',
    status: 'running',
    timestamp: new Date().toISOString(),
  };

  const startTime = Date.now();

  try {
    const { stdout, stderr, exitCode } = await runCommand(
      'npx',
      ['playwright', 'test', '--reporter=json'],
      process.cwd()
    );

    result.duration = Date.now() - startTime;
    result.output = stdout + stderr;
    result.status = exitCode === 0 ? 'passed' : 'failed';

    // Parse Playwright JSON output
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*"suites"[\s\S]*\}/);
      if (jsonMatch) {
        const pwResult = JSON.parse(jsonMatch[0]);
        const stats = pwResult.stats || {};
        result.output = `Passed: ${stats.expected || 0}, Failed: ${stats.unexpected || 0}, Skipped: ${stats.skipped || 0}`;
      }
    } catch {
      // Keep raw output if JSON parsing fails
    }
  } catch (error) {
    result.status = 'failed';
    result.errors = [error.message];
    result.duration = Date.now() - startTime;
  }

  return result;
}

// Run extension tests
async function runExtensionTests() {
  const result = {
    name: 'Extension Tests',
    type: 'extension',
    status: 'running',
    timestamp: new Date().toISOString(),
  };

  const startTime = Date.now();

  try {
    const { stdout, stderr, exitCode } = await runCommand(
      'npx',
      ['jest', '--json', '--testPathPattern=extension'],
      process.cwd()
    );

    result.duration = Date.now() - startTime;
    result.output = stdout + stderr;
    result.status = exitCode === 0 ? 'passed' : 'failed';

    try {
      const jsonMatch = stdout.match(/\{[\s\S]*"numPassedTests"[\s\S]*\}/);
      if (jsonMatch) {
        const jestResult = JSON.parse(jsonMatch[0]);
        result.output = `Passed: ${jestResult.numPassedTests}, Failed: ${jestResult.numFailedTests}`;
      }
    } catch {
      // Keep raw output
    }
  } catch (error) {
    result.status = 'failed';
    result.errors = [error.message];
    result.duration = Date.now() - startTime;
  }

  return result;
}

// Run all tests
async function runAllTests() {
  currentSuite = {
    id: `suite-${Date.now()}`,
    results: [],
    startTime: new Date(),
    status: 'running',
  };

  console.log('\n🧪 Starting test suite...\n');

  // Run unit tests
  console.log('📦 Running Unit Tests...');
  const unitResult = await runUnitTests();
  currentSuite.results.push(unitResult);
  console.log(`   ${unitResult.status === 'passed' ? '✅' : '❌'} ${unitResult.name} (${unitResult.duration}ms)`);

  // Run extension tests
  console.log('🔌 Running Extension Tests...');
  const extResult = await runExtensionTests();
  currentSuite.results.push(extResult);
  console.log(`   ${extResult.status === 'passed' ? '✅' : '❌'} ${extResult.name} (${extResult.duration}ms)`);

  // Run E2E tests (only if dev server is running)
  console.log('🌐 Running E2E Tests...');
  const e2eResult = await runE2ETests();
  currentSuite.results.push(e2eResult);
  console.log(`   ${e2eResult.status === 'passed' ? '✅' : '❌'} ${e2eResult.name} (${e2eResult.duration}ms)`);

  currentSuite.endTime = new Date();
  currentSuite.status = 'completed';

  // Summary
  const passed = currentSuite.results.filter(r => r.status === 'passed').length;
  const failed = currentSuite.results.filter(r => r.status === 'failed').length;
  const total = currentSuite.results.length;

  console.log('\n📊 Test Summary:');
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Failed: ${failed}/${total}`);
  console.log(`   Duration: ${currentSuite.endTime.getTime() - currentSuite.startTime.getTime()}ms\n`);

  return currentSuite;
}

// HTML template for results page
function generateHTML(suite) {
  const statusEmoji = (status) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '🔄';
      default: return '⏳';
    }
  };

  const results = suite.results.map(r => `
    <div class="result ${r.status}">
      <div class="result-header">
        <span class="status">${statusEmoji(r.status)}</span>
        <span class="name">${r.name}</span>
        <span class="duration">${r.duration ? r.duration + 'ms' : ''}</span>
      </div>
      ${r.output ? `<pre class="output">${r.output}</pre>` : ''}
      ${r.errors?.length ? `<div class="errors">${r.errors.map(e => `<div class="error">${e}</div>`).join('')}</div>` : ''}
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Test Results - Streamline AI</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #0f0f0f;
      color: #e0e0e0;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    h1 {
      color: #3b82f6;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 10px;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: #2563eb;
    }
    button:disabled {
      background: #4b5563;
      cursor: not-allowed;
    }
    .summary {
      background: #1f1f1f;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .summary-stats {
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
    }
    .stat {
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
    }
    .stat-value.passed { color: #22c55e; }
    .stat-value.failed { color: #ef4444; }
    .stat-label {
      color: #9ca3af;
      font-size: 14px;
    }
    .result {
      background: #1f1f1f;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      border-left: 4px solid #4b5563;
    }
    .result.passed { border-left-color: #22c55e; }
    .result.failed { border-left-color: #ef4444; }
    .result.running { border-left-color: #f59e0b; }
    .result-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status {
      font-size: 20px;
    }
    .name {
      font-weight: 600;
      flex: 1;
    }
    .duration {
      color: #9ca3af;
      font-size: 14px;
    }
    .output {
      background: #0a0a0a;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 13px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .errors {
      margin-top: 10px;
    }
    .error {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      padding: 8px;
      border-radius: 4px;
      font-size: 13px;
      margin-bottom: 5px;
    }
    .timestamp {
      color: #6b7280;
      font-size: 12px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 Test Results</h1>
    
    <div class="actions">
      <button onclick="runTests()" id="runBtn">Run All Tests</button>
      <button onclick="runUnitOnly()">Unit Tests Only</button>
      <button onclick="runExtOnly()">Extension Tests</button>
      <button onclick="runE2EOnly()">E2E Tests Only</button>
      <button onclick="location.reload()">Refresh</button>
    </div>
    
    <div class="summary">
      <div class="summary-stats">
        <div class="stat">
          <div class="stat-value passed">${suite.results.filter(r => r.status === 'passed').length}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat">
          <div class="stat-value failed">${suite.results.filter(r => r.status === 'failed').length}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat">
          <div class="stat-value">${suite.results.length}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat">
          <div class="stat-value">${suite.endTime && suite.startTime ? Math.round((suite.endTime.getTime() - suite.startTime.getTime()) / 1000) + 's' : '-'}</div>
          <div class="stat-label">Duration</div>
        </div>
      </div>
    </div>
    
    <div class="results">
      ${results || '<p>No test results yet. Click "Run All Tests" to start.</p>'}
    </div>
    
    <div class="timestamp">
      ${suite.endTime ? 'Last run: ' + suite.endTime.toLocaleString() : 'Tests not run yet'}
    </div>
  </div>
  
  <script>
    async function runTests() {
      document.getElementById('runBtn').disabled = true;
      document.getElementById('runBtn').textContent = 'Running...';
      
      try {
        await fetch('/run');
        location.reload();
      } catch (err) {
        alert('Error running tests: ' + err.message);
      }
      
      document.getElementById('runBtn').disabled = false;
      document.getElementById('runBtn').textContent = 'Run All Tests';
    }
    
    async function runUnitOnly() {
      await fetch('/run-unit');
      location.reload();
    }
    
    async function runExtOnly() {
      await fetch('/run-extension');
      location.reload();
    }
    
    async function runE2EOnly() {
      await fetch('/run-e2e');
      location.reload();
    }
    
    // Auto-refresh if tests are running
    ${suite.status === 'running' ? 'setTimeout(() => location.reload(), 2000);' : ''}
  </script>
</body>
</html>
  `;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/run') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    await runAllTests();
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (url.pathname === '/run-unit') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    currentSuite = { id: `suite-${Date.now()}`, results: [], startTime: new Date(), status: 'running' };
    const result = await runUnitTests();
    currentSuite.results = [result];
    currentSuite.endTime = new Date();
    currentSuite.status = 'completed';
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (url.pathname === '/run-extension') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    currentSuite = { id: `suite-${Date.now()}`, results: [], startTime: new Date(), status: 'running' };
    const result = await runExtensionTests();
    currentSuite.results = [result];
    currentSuite.endTime = new Date();
    currentSuite.status = 'completed';
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (url.pathname === '/run-e2e') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    currentSuite = { id: `suite-${Date.now()}`, results: [], startTime: new Date(), status: 'running' };
    const result = await runE2ETests();
    currentSuite.results = [result];
    currentSuite.endTime = new Date();
    currentSuite.status = 'completed';
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (url.pathname === '/api/results') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(currentSuite));
    return;
  }

  // Default: show HTML results page
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(generateHTML(currentSuite));
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`\n🧪 Test Server running at http://localhost:${PORT}`);
  console.log('\nCommands:');
  console.log('  - Open browser to see results');
  console.log('  - Click "Run All Tests" to execute test suite');
  console.log('  - Use individual test buttons for specific suites\n');
});

