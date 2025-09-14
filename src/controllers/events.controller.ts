import { Request, Response } from 'express';
import { ScraperService } from '../services/scraper.service';
import { ScraperResponseSchema } from '../models/event.model';

export class EventsController {
  static async getFiestas(req: Request, res: Response) {
    try {
      const result = await ScraperService.scrapeFiestas();

      const validatedResult = ScraperResponseSchema.parse(result);

      return res.status(200).json(validatedResult);
    } catch (error) {
      console.error('Error in getFiestas:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Internal server error while scraping fiestas'
      });
    }
  }

  static async getFestivales(req: Request, res: Response) {
    try {
      const result = await ScraperService.scrapeFestivales();

      const validatedResult = ScraperResponseSchema.parse(result);

      return res.status(200).json(validatedResult);
    } catch (error) {
      console.error('Error in getFestivales:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Internal server error while scraping festivales'
      });
    }
  }

  static async getAllEvents(req: Request, res: Response) {
    try {
      const result = await ScraperService.scrapeAllEvents();

      const validatedResult = ScraperResponseSchema.parse(result);

      return res.status(200).json(validatedResult);
    } catch (error) {
      console.error('Error in getAllEvents:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Internal server error while scraping all events'
      });
    }
  }

  static async getEventsByType(req: Request, res: Response) {
    try {
      const { type } = req.params;

      if (type !== 'Fiestas' && type !== 'Festivales') {
        return res.status(400).json({
          success: false,
          data: [],
          error: 'Invalid event type. Must be "Fiestas" or "Festivales"'
        });
      }

      const result = await ScraperService.scrapeEvents(type);

      const validatedResult = ScraperResponseSchema.parse(result);

      return res.status(200).json(validatedResult);
    } catch (error) {
      console.error('Error in getEventsByType:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Internal server error while scraping events by type'
      });
    }
  }
}