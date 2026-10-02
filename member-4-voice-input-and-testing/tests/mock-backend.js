/**
 * PRAYAS 3.0 - Standalone Mock RAG Server (Simulating Member 3 FastAPI Backend)
 * 
 * Runs a lightweight HTTP server on port 8000 using native Node.js (no npm install required).
 * 
 * Usage:
 *   node tests/mock-backend.js
 * 
 * Endpoints:
 * - GET  /api/v1/health
 * - POST /api/v1/generate-answer
 */

import http from 'http';

const PORT = 8000;

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check endpoint
  if (req.method === 'GET' && url.pathname === '/api/v1/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'PRAYAS RAG Backend Service',
      version: '3.0.0',
      uptime: process.uptime()
    }));
    return;
  }

  // Answer generation endpoint
  if (req.method === 'POST' && url.pathname === '/api/v1/generate-answer') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const question = (payload.question || '').toLowerCase();
        const supplementalNotes = payload.supplemental_notes || '';

        console.log(`[PRAYAS Mock RAG] Received Question: "${payload.question}"`);

        // Check for empty evidence test case
        if (question.includes('quantum') || question.includes('patent') || question.includes('unknown')) {
          if (!supplementalNotes) {
            const lowEvidenceResponse = {
              success: true,
              draft_answer: null,
              confidence: 0.18,
              evidence_found: false,
              sources: [],
              needs_clarification: true,
              clarification_prompt: "I could not find references to this topic in your uploaded resume. Which project or experience would you like to highlight instead?"
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(lowEvidenceResponse));
            return;
          }

          // Clarification provided by user
          const clarifiedResponse = {
            success: true,
            draft_answer: `Drawing from my background and note ("${supplementalNotes}"), I applied core engineering practices to solve complex workflows, ensuring accessibility and compliance.`,
            confidence: 0.85,
            evidence_found: true,
            sources: ['Candidate Voice Clarification', 'Resume: Engineering Experience'],
            needs_clarification: false,
            clarification_prompt: null
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(clarifiedResponse));
          return;
        }

        // Standard High-Evidence RAG answer
        const standardResponse = {
          success: true,
          draft_answer: "In my previous software engineering role, I led the redesign of critical user flows to achieve full WCAG 2.1 AA accessibility compliance. I implemented ARIA live announcements, focus management, and keyboard navigation traps, decreasing navigation errors by 45% and ensuring seamless screen-reader compatibility.",
          confidence: 0.94,
          evidence_found: true,
          sources: [
            'Resume: Experience -> Frontend Accessibility Lead',
            'Project Summary: PRAYAS Assistive System'
          ],
          needs_clarification: false,
          clarification_prompt: null
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(standardResponse));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 404 Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`[PRAYAS Mock RAG Backend] Running on http://localhost:${PORT}`);
  console.log(`- Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`- Answer API:   http://localhost:${PORT}/api/v1/generate-answer`);
});
