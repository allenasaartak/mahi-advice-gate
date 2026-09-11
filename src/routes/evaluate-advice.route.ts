import type { FastifyPluginCallback } from 'fastify';

import { evaluateAdvice } from '../domain/decision/evaluate-advice.js';
import {
  EvaluateAdviceRequestSchema,
  type EvaluateAdviceRequest,
} from '../schemas/advice-request.schema.js';
import { EvaluationResponseSchema } from '../schemas/evaluation.schema.js';

export const evaluateAdviceRoute: FastifyPluginCallback = (app, _options, done) => {
  app.post<{ Body: EvaluateAdviceRequest }>(
    '/evaluate-advice',
    {
      schema: {
        body: EvaluateAdviceRequestSchema,
        response: {
          200: EvaluationResponseSchema,
        },
      },
    },
    (request) => {
      const { profile, proposal } = request.body;

      return evaluateAdvice(profile, proposal);
    },
  );

  done();
};
