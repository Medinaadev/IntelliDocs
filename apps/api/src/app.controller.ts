import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class AppController {
    @Get()
    root(@Res() res: Response) {
        return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IntelliDocs API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #09090b;
      color: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }
    .card {
      max-width: 420px;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 40px 32px;
      background: #111113;
    }
    .emoji { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #fafafa; }
    p { font-size: 14px; color: #71717a; line-height: 1.6; }
    .badge {
      display: inline-block;
      margin-top: 24px;
      padding: 6px 14px;
      background: #1a1a1d;
      border: 1px solid #27272a;
      border-radius: 999px;
      font-size: 12px;
      color: #52525b;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; display: inline-block; margin-right: 6px; vertical-align: middle; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">🤖</div>
    <h1>Aquí no hay nada para ti</h1>
    <p>Esto es la API de IntelliDocs. Si estás leyendo esto probablemente te has perdido.<br/><br/>La aplicación está en otro sitio.</p>
    <div class="badge"><span class="dot"></span>API operativa</div>
  </div>
</body>
</html>`);
    }
}
