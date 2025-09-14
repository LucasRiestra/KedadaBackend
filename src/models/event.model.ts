import { z } from 'zod';

export const EventTypeSchema = z.enum(['Fiestas', 'Festivales']);

export const ScrapedEventSchema = z.object({
  title: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageAlt: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  period: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  type: EventTypeSchema,
});

export const ScraperResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ScrapedEventSchema),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type EventType = z.infer<typeof EventTypeSchema>;
export type ScrapedEvent = z.infer<typeof ScrapedEventSchema>;
export type ScraperResponse = z.infer<typeof ScraperResponseSchema>;