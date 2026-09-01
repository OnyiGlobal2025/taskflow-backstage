const http = require('http');

const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      service: '${{ values.name }}',
      message: 'Scaffolded by the TaskFlow golden path.',
    }),
  );
});

server.listen(PORT, () => {
  console.log(`${{ values.name }} listening on port ${PORT}`);
});