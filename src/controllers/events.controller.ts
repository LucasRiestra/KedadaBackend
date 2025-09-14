import { Request, Response } from 'express';
import { ScraperService } from '../services/scraper.service';
import { ScraperResponseSchema, ScrapedEvent } from '../models/event.model';

// In-memory cache for events (in production, use Redis or database)
let eventsCache: {
  data: ScrapedEvent[];
  lastUpdate: Date | null;
  isUpdating: boolean;
} = {
  data: [],
  lastUpdate: null,
  isUpdating: false
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export class EventsController {
  // Initialize cache on server startup
  static async initializeCache() {
    if (!eventsCache.isUpdating) {
      console.log('Initializing events cache...');
      eventsCache.isUpdating = true;

      try {
        const result = await ScraperService.scrapeAllEvents();
        if (result.success && result.data.length > 0) {
          eventsCache.data = result.data;
          eventsCache.lastUpdate = new Date();
          console.log(`Cache initialized with ${result.data.length} events`);
        }
      } catch (error) {
        console.error('Failed to initialize cache:', error);
      } finally {
        eventsCache.isUpdating = false;
      }
    }
  }
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

  static async getEspectaculos(req: Request, res: Response) {
    try {
      const result = await ScraperService.scrapeEspectaculos();

      const validatedResult = ScraperResponseSchema.parse(result);

      return res.status(200).json(validatedResult);
    } catch (error) {
      console.error('Error in getEspectaculos:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Internal server error while scraping espectáculos'
      });
    }
  }

  static async getExposiciones(req: Request, res: Response) {
    try {
      const result = await ScraperService.scrapeExposiciones();

      const validatedResult = ScraperResponseSchema.parse(result);

      return res.status(200).json(validatedResult);
    } catch (error) {
      console.error('Error in getExposiciones:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Internal server error while scraping exposiciones'
      });
    }
  }

  static async getAllEvents(req: Request, res: Response) {
    try {
      const now = new Date();
      const needsUpdate = !eventsCache.lastUpdate ||
                         (now.getTime() - eventsCache.lastUpdate.getTime()) > CACHE_DURATION;

      // If cache is fresh, return immediately
      if (!needsUpdate && eventsCache.data.length > 0) {
        console.log('Returning cached events');
        return res.status(200).json({
          success: true,
          data: eventsCache.data,
          message: `Returned ${eventsCache.data.length} cached events`,
          cached: true,
          lastUpdate: eventsCache.lastUpdate
        });
      }

      // If we need to update but not currently updating, start background update
      if (needsUpdate && !eventsCache.isUpdating) {
        console.log('Starting background scraping...');
        eventsCache.isUpdating = true;

        // Start background scraping (don't await)
        ScraperService.scrapeAllEvents()
          .then(result => {
            if (result.success && result.data.length > 0) {
              eventsCache.data = result.data;
              eventsCache.lastUpdate = new Date();
              console.log(`Background scraping completed: ${result.data.length} events`);
            }
          })
          .catch(error => {
            console.error('Background scraping failed:', error);
          })
          .finally(() => {
            eventsCache.isUpdating = false;
          });
      }

      // Return current cache immediately (even if empty/stale)
      const responseData = eventsCache.data.length > 0 ? eventsCache.data : [];
      const isStale = eventsCache.lastUpdate && needsUpdate;

      return res.status(200).json({
        success: true,
        data: responseData,
        message: responseData.length > 0
          ? `Returned ${responseData.length} events${isStale ? ' (updating in background)' : ''}`
          : 'No events available yet, scraping in progress...',
        cached: true,
        lastUpdate: eventsCache.lastUpdate,
        updating: eventsCache.isUpdating
      });

    } catch (error) {
      console.error('Error in getAllEvents:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Internal server error'
      });
    }
  }

  static async getEventsByType(req: Request, res: Response) {
    try {
      const { type } = req.params;

      if (type !== 'Fiestas' && type !== 'Festivales' && type !== 'Espectáculos' && type !== 'Exposiciones') {
        return res.status(400).json({
          success: false,
          data: [],
          error: 'Invalid event type. Must be "Fiestas", "Festivales", "Espectáculos", or "Exposiciones"'
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