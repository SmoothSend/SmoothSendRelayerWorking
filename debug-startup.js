// Simple debug script to test Azure startup
console.log('=== STARTUP DEBUG ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Current directory:', process.cwd());
console.log('Environment variables:');

// Check critical environment variables
const criticalVars = [
  'PORT',
  'RELAYER_PRIVATE_KEY',
  'CONTRACT_ADDRESS',
  'APTOS_RPC_URL',
  'TREASURY_ADDRESS',
  'REDIS_URL',
  'DATABASE_URL'
];

criticalVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`  ${varName}: ${value ? '[SET]' : '[MISSING]'}`);
});

// Test basic server
const http = require('http');
const port = process.env.PORT || 3000;

console.log(`\nAttempting to start server on port ${port}...`);

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    message: 'Debug server is running!', 
    timestamp: new Date().toISOString(),
    port: port
  }));
});

server.listen(port, () => {
  console.log(`✅ Debug server started successfully on port ${port}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});
