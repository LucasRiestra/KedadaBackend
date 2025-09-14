import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedEvent, EventType, ScraperResponse } from '../models/event.model';

export class ScraperService {
  private static readonly BASE_URL = 'https://www.dipalme.org/Servicios/cmsdipro/index.nsf/fiestas_view_actividad.xsp';
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_DELAY = 2000; // 2 seconds
  private static readonly REQUEST_DELAY = 3000; // 3 seconds between requests

  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
  ];

  private static getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static async makeRequestWithRetry(url: string, attempt = 1): Promise<string> {
    const config: AxiosRequestConfig = {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000, // 30 seconds
      maxRedirects: 5
    };

    try {
      const response = await axios.get(url, config);
      return response.data;
    } catch (error) {
      if (attempt >= this.MAX_RETRIES) {
        throw error;
      }

      const delay = this.INITIAL_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`Request failed, retrying in ${delay}ms... (attempt ${attempt}/${this.MAX_RETRIES})`);

      await this.delay(delay);
      return this.makeRequestWithRetry(url, attempt + 1);
    }
  }

  static async scrapeEvents(eventType: EventType): Promise<ScraperResponse> {
    try {
      const url = `${this.BASE_URL}?p=dipalme&actividad=${eventType}`;

      console.log(`Starting scraping for ${eventType}...`);
      const data = await this.makeRequestWithRetry(url);

      const $ = cheerio.load(data);
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

  static async scrapeEspectaculos(): Promise<ScraperResponse> {
    return this.scrapeEvents('Espectáculos');
  }

  static async scrapeExposiciones(): Promise<ScraperResponse> {
    return this.scrapeEvents('Exposiciones');
  }

  static async scrapeAllEvents(): Promise<ScraperResponse> {
    try {
      const [fiestasResponse, festivalesResponse, espectaculosResponse, exposicionesResponse] = await Promise.all([
        this.scrapeFiestas(),
        this.scrapeFestivales(),
        this.scrapeEspectaculos(),
        this.scrapeExposiciones()
      ]);

      const allEvents = [
        ...fiestasResponse.data,
        ...festivalesResponse.data,
        ...espectaculosResponse.data,
        ...exposicionesResponse.data
      ];

      return {
        success: true,
        data: allEvents,
        message: `Successfully scraped ${allEvents.length} total events (${fiestasResponse.data.length} fiestas, ${festivalesResponse.data.length} festivales, ${espectaculosResponse.data.length} espectáculos, ${exposicionesResponse.data.length} exposiciones)`
      };
    } catch (error) {
      console.error('Error in scrapeAllEvents:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error scraping all events'
      };
    }
  }
}