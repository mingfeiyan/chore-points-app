#!/usr/bin/env node
/**
 * Local Celebration Server
 * 
 * Runs on localhost:3001 and triggers Hue lights when called.
 * This bypasses the HTTPS→HTTP mixed content browser restriction.
 * 
 * Usage: node scripts/celebration-server.js
 * Or:    npm run celebration-server
 */

const http = require('http');
const https = require('https');

const PORT = 3001;
const HUE_BRIDGE_IP = '192.168.86.240';
const HUE_USERNAME = '1cC8AHppFgU4p77qw2rK8YAK-XWoHD6hx-02rBLx';

// Room IDs
const ROOMS = {
  BEDROOM: '1',
  LIVING_ROOM: '2',
  GUEST_ROOM: '3',
};

// Colors (hue values 0-65535)
const COLORS = {
  blue: 46920,
  red: 0,
  green: 25500,
  yellow: 12750,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setGroupState(groupId, state) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(state);
    const options = {
      hostname: HUE_BRIDGE_IP,
      port: 80,
      path: `/api/${HUE_USERNAME}/groups/${groupId}/action`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getGroupState(groupId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HUE_BRIDGE_IP,
      port: 80,
      path: `/api/${HUE_USERNAME}/groups/${groupId}`,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.end();
  });
}

async function flashLights(groupId, color, times, intervalMs) {
  const hueValue = typeof color === 'string' ? COLORS[color] || COLORS.blue : color;
  
  // Get current state
  const currentState = await getGroupState(groupId);
  const wasOn = currentState?.state?.any_on ?? false;
  const originalBri = currentState?.action?.bri ?? 254;
  const originalHue = currentState?.action?.hue;
  const originalSat = currentState?.action?.sat;
  const originalCt = currentState?.action?.ct;

  console.log(`Flashing ${color} ${times} times...`);

  // Flash
  for (let i = 0; i < times; i++) {
    await setGroupState(groupId, {
      on: true,
      hue: hueValue,
      sat: 254,
      bri: 254,
      transitiontime: 0,
    });
    await sleep(intervalMs / 2);
    await setGroupState(groupId, { on: false, transitiontime: 0 });
    await sleep(intervalMs / 2);
  }

  // Restore
  if (wasOn) {
    const restore = { on: true, bri: originalBri, transitiontime: 5 };
    if (originalCt) restore.ct = originalCt;
    else if (originalHue !== undefined) {
      restore.hue = originalHue;
      restore.sat = originalSat;
    }
    await setGroupState(groupId, restore);
  }

  console.log('Done!');
}

// Create server
const server = http.createServer(async (req, res) => {
  // CORS headers for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/celebrate' || url.pathname === '/celebrate/points') {
    // Points celebration - bedroom, blue, 3 times
    await flashLights(ROOMS.BEDROOM, 'blue', 3, 600);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, effect: 'points' }));
  } else if (url.pathname === '/celebrate/achievement') {
    // Achievement - bedroom, green, 3 times
    await flashLights(ROOMS.BEDROOM, 'green', 3, 500);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, effect: 'achievement' }));
  } else if (url.pathname === '/celebrate/milestone') {
    // Milestone - bedroom, yellow, 5 times
    await flashLights(ROOMS.BEDROOM, 'yellow', 5, 400);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, effect: 'milestone' }));
  } else if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`🎉 Celebration server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST http://localhost:${PORT}/celebrate        - Blue flash (points)`);
  console.log(`  POST http://localhost:${PORT}/celebrate/points - Blue flash (points)`);
  console.log(`  POST http://localhost:${PORT}/celebrate/achievement - Green flash`);
  console.log(`  POST http://localhost:${PORT}/celebrate/milestone   - Yellow flash`);
  console.log(`  GET  http://localhost:${PORT}/health           - Health check`);
  console.log('');
  console.log('Press Ctrl+C to stop');
});
