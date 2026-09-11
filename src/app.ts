import Fastify from 'fastify';

import { evaluateAdviceRoute } from './routes/evaluate-advice.route.js';

export function buildApp() {
  const app = Fastify({
    logger: false,
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  });

  app.get('/health', () => ({ status: 'ok' }));

  app.register(evaluateAdviceRoute);

  return app;
}
