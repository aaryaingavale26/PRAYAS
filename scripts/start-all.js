const { spawn, spawnSync } = require('child_process');
const path = require('path');
const http = require('http');

console.log('\x1b[36m%s\x1b[0m', '================================================================');
console.log('\x1b[36m%s\x1b[0m', '   PRAYAS 3.0: Accessible Job Application Assistant — Launch    ');
console.log('\x1b[36m%s\x1b[0m', '   Team ByteShastra | Problem Statement PS003                   ');
console.log('\x1b[36m%s\x1b[0m', '================================================================\n');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

// 1. Resolve Python path
const venvPython = isWindows
  ? path.join(rootDir, 'prayas-backend', '.venv', 'Scripts', 'python.exe')
  : path.join(rootDir, 'prayas-backend', '.venv', 'bin', 'python');

function freePortIfOccupied(port) {
  if (!isWindows) return;
  try {
    const res = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `(Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess`
    ], { encoding: 'utf8' });
    const pids = (res.stdout || '').trim().split(/\s+/).filter(Boolean);
    for (const pid of pids) {
      if (pid && pid !== '0' && pid !== String(process.pid)) {
        console.log(`\x1b[33m[CLEANUP]\x1b[0m Freeing port ${port} held by process PID ${pid}...`);
        spawnSync('taskkill', ['/pid', pid, '/f', '/t'], { stdio: 'ignore' });
      }
    }
  } catch (e) {}
}

freePortIfOccupied(8000);
freePortIfOccupied(3000);

console.log('\x1b[33m%s\x1b[0m', '▶ Starting Member 2: FastAPI Backend Server on port 8000...');

const backend = spawn(
  venvPython,
  ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'],
  {
    cwd: path.join(rootDir, 'prayas-backend'),
    stdio: ['inherit', 'pipe', 'pipe']
  }
);

backend.stdout.on('data', (data) => {
  const line = data.toString().trim();
  if (line) console.log('\x1b[32m[BACKEND]\x1b[0m', line);
});

backend.stderr.on('data', (data) => {
  const line = data.toString().trim();
  if (line) console.log('\x1b[32m[BACKEND]\x1b[0m', line);
});

console.log('\x1b[33m%s\x1b[0m', '▶ Starting Member 1: Next.js Web Application on port 3000...');

const frontend = isWindows
  ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm run dev'], {
      cwd: path.join(rootDir, 'member_1'),
      stdio: ['inherit', 'pipe', 'pipe']
    })
  : spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'member_1'),
      stdio: ['inherit', 'pipe', 'pipe']
    });

frontend.stdout.on('data', (data) => {
  const line = data.toString().trim();
  if (line) console.log('\x1b[34m[FRONTEND]\x1b[0m', line);
});

frontend.stderr.on('data', (data) => {
  const line = data.toString().trim();
  if (line) console.log('\x1b[34m[FRONTEND]\x1b[0m', line);
});

setTimeout(() => {
  console.log('\n\x1b[32m%s\x1b[0m', '✔ ALL SERVICES INITIALIZED AND READY FOR DEMO:');
  console.log('\x1b[1m%s\x1b[0m', '  • Web Application (Member 1):  http://localhost:3000');
  console.log('\x1b[1m%s\x1b[0m', '  • Live Demo Portal (Member 4): http://localhost:3000/demo/job-application.html');
  console.log('\x1b[1m%s\x1b[0m', '  • Pitch Console (Member 4):    http://localhost:3000/demo/presentation-mode.html');
  console.log('\x1b[1m%s\x1b[0m', '  • FastAPI & RAG API (Member 2):http://localhost:8000/docs');
  console.log('\x1b[1m%s\x1b[0m', '  • Chrome Extension (Member 3): Load folder "member-3-prayas-extension" into chrome://extensions\n');
  console.log('\x1b[90m%s\x1b[0m', 'Press Ctrl+C to terminate all services.\n');
}, 3500);

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down PRAYAS 3.0 services...');
  try {
    if (backend && backend.pid) {
      if (isWindows) {
        spawnSync('taskkill', ['/pid', String(backend.pid), '/f', '/t'], { stdio: 'ignore' });
      } else {
        backend.kill('SIGINT');
      }
    }
  } catch (e) {}

  try {
    if (frontend && frontend.pid) {
      if (isWindows) {
        spawnSync('taskkill', ['/pid', String(frontend.pid), '/f', '/t'], { stdio: 'ignore' });
      } else {
        frontend.kill('SIGINT');
      }
    }
  } catch (e) {}

  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
