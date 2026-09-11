import type { FastifyPluginCallback } from 'fastify';

import { evaluateAdvice } from '../domain/decision/evaluate-advice.js';
import { validateFinancialProfileIntegrity } from '../domain/input/request-integrity.js';
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

      preHandler: (request, reply, next) => {
        const errors = validateFinancialProfileIntegrity(request.body.profile);

        if (errors.length > 0) {
          reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: errors.join('; '),
          });

          return;
        }

        next();
      },
    },
    (request) => {
      const { profile, proposal } = request.body;

      return evaluateAdvice(profile, proposal);
    },
  );

  done();
};
