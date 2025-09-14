import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedEvent, EventType, ScraperResponse } from '../models/event.model';

export class ScraperService {
  private static readonly BASE_URL = 'https://www.dipalme.org/Servicios/cmsdipro/index.nsf/fiestas_view_actividad.xsp';

  static async scrapeEvents(eventType: EventType): Promise<ScraperResponse> {
    try {
      const url = `${this.BASE_URL}?p=dipalme&actividad=${eventType}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const events: ScrapedEvent[] = [];

      $('.date-eventos').each((index, element) => {
        try {
          const $element = $(element);
          const title = $element.text().trim() || null;

          // Try different ways to find the container
          let $container = $element.parent();

          // If vista-fiestas-resumen is not found, go up the DOM tree
          while ($container.length && !$container.find('.vista-fiestas-resumen').length) {
            $container = $container.parent();
            // Prevent infinite loop
            if ($container.is('body') || $container.length === 0) break;
          }

          // Look for image in the same container
          const $img = $container.find('img').first();
          const imageUrl = $img.attr('src') || null;
          const imageAlt = $img.attr('alt') || null;

          // Find the vista-fiestas-resumen div in the same container
          const $resumen = $container.find('.vista-fiestas-resumen').first();
          const paragraphs = $resumen.find('p');

          let startDate = null;
          let endDate = null;
          let location = null;
          let period = null;
          let category = null;

          paragraphs.each((i, p) => {
            const text = $(p).text().trim();

            if (text.includes('Del :') && text.includes('Al:')) {
              const dateMatch = text.match(/Del\s*:\s*([^\s]+).*Al:\s*([^\s]+)/);
              if (dateMatch) {
                startDate = dateMatch[1];
                endDate = dateMatch[2];
              }
            } else if (text.startsWith('Lugar:')) {
              location = text.replace('Lugar:', '').trim();
            } else if (text.startsWith('Perido:') || text.startsWith('Período:')) {
              period = text.replace(/Perido:|Período:/, '').trim();
            } else if (text.startsWith('Tipo:')) {
              category = text.replace('Tipo:', '').trim();
            }
          });

          const event: ScrapedEvent = {
            title,
            imageUrl: imageUrl ? `https://www.dipalme.org${imageUrl}` : null,
            imageAlt,
            startDate,
            endDate,
            location,
            period,
            category,
            type: eventType
          };

          events.push(event);
        } catch (elementError) {
          console.warn('Error processing individual event:', elementError);
        }
      });

      return {
        success: true,
        data: events,
        message: `Successfully scraped ${events.length} ${eventType.toLowerCase()}`
      };

    } catch (error) {
      console.error('Scraping error:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      };
    }
  }

  static async scrapeFiestas(): Promise<ScraperResponse> {
    return this.scrapeEvents('Fiestas');
  }

  static async scrapeFestivales(): Promise<ScraperResponse> {
    return this.scrapeEvents('Festivales');
  }

  static async scrapeAllEvents(): Promise<ScraperResponse> {
    try {
      const [fiestasResponse, festivalesResponse] = await Promise.all([
        this.scrapeFiestas(),
        this.scrapeFestivales()
      ]);

      const allEvents = [
        ...fiestasResponse.data,
        ...festivalesResponse.data
      ];

      return {
        success: true,
        data: allEvents,
        message: `Successfully scraped ${allEvents.length} total events`
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error scraping all events'
      };
    }
  }
}