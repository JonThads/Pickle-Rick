// =============================================================================
// Prometheus metrics
// =============================================================================
// Exposes default Node.js process metrics plus custom HTTP request
// counters/timers, scraped by Prometheus at GET /metrics.

const client = require('prom-client');

// Collects default Node.js metrics (CPU, memory, event loop lag, GC).

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'pickle_rick_' });

// Counts every HTTP request by method, route, and status code.

const httpRequestCounter = new client.Counter({
  name: 'pickle_rick_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Percentile Queries
// (e.g. p95 latency) in Grafana.

const httpRequestsDuration = new client.Histogram({
  name: 'pickle_rick_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
})

// Middleware

function metricsMiddleware(req, res, next) {
    const end = httpRequestsDuration.startTimer();
    res.on('finish', () => {
        const route = req.route ? `${req.baseUrl}${req.route.path}` : req.path;
        httpRequestCounter.inc({ method: req.method, route, status_code: res.statusCode });
        end({ method: req.method, route, status_code: res.statusCode });
    });

    next();
}

module.exports = { client, metricsMiddleware };