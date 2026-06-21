#!/usr/bin/env node
/**
 * Quick Render Deployment Checklist
 * Use this to verify everything is ready before pushing to Render
 */

const fs = require('fs');
const path = require('path');

const checks = [
  {
    name: '✓ npm run start:socket exists',
    test: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.scripts && pkg.scripts['start:socket'];
    },
  },
  {
    name: '✓ server/melodyMess/gameServer.js exists',
    test: () => fs.existsSync('server/melodyMess/gameServer.js'),
  },
  {
    name: '✓ render.yaml exists',
    test: () => fs.existsSync('render.yaml'),
  },
  {
    name: '✓ FRONTEND_URL can be set as env var',
    test: () => {
      const gameServer = fs.readFileSync('server/melodyMess/gameServer.js', 'utf8');
      return gameServer.includes('process.env.FRONTEND_URL');
    },
  },
  {
    name: '✓ Socket.IO listens on SOCKET_PORT or PORT',
    test: () => {
      const gameServer = fs.readFileSync('server/melodyMess/gameServer.js', 'utf8');
      return (
        gameServer.includes('process.env.SOCKET_PORT') ||
        gameServer.includes('process.env.PORT')
      );
    },
  },
];

let allPassed = true;
checks.forEach((check) => {
  const passed = check.test();
  console.log(passed ? check.name : `✗ ${check.name}`);
  if (!passed) allPassed = false;
});

console.log('');
if (allPassed) {
  console.log('🎉 All checks passed! Ready to deploy to Render.');
  console.log('');
  console.log('Next steps:');
  console.log('1. Update Render service start command to: npm run start:socket');
  console.log('2. OR deploy new service via render.yaml');
  console.log('3. Set FRONTEND_URL=https://testweb67-9c814.web.app in env');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. See above.');
  process.exit(1);
}
