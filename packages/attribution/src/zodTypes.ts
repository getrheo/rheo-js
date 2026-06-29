import { z } from 'zod';

export const AttributionConfidenceSchema = z.enum(['high', 'medium', 'low']);
