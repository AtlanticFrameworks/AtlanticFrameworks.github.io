import { Env } from '../types/index.js';
import { json } from '../middleware/auth.js';

/**
 * Controller for the public Friedenszeit API.
 * 
 * Logic based on the Friedenszeit protocol:
 * - ACTIVE during even hours (00, 02, 04, ...)
 * - INACTIVE during odd hours (01, 03, 05, ...)
 * - Switches happen at the top of every hour (:00:00).
 * - Calculations performed in Europe/Berlin (German) time.
 */
export class FriedenszeitController {
  
  static async getStatus(_req: Request, _env: Env): Promise<Response> {
    const now = new Date();
    
    // 1. Get current hour in Europe/Berlin
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Berlin',
      hour: 'numeric',
      hour12: false
    });
    
    // formatToParts is reliable for getting the hour
    const parts = formatter.formatToParts(now);
    const germanHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    
    // 2. Determine status
    const isActive = germanHour % 2 === 0;
    
    // 3. Calculate next switch (next full hour)
    // We find the current minutes and seconds and subtract them from 3600 to find seconds remaining
    // Or just create a new date and set it to the next hour.
    const nextSwitchDate = new Date(now);
    nextSwitchDate.setMinutes(0, 0, 0);
    nextSwitchDate.setHours(nextSwitchDate.getHours() + 1);
    
    const secondTimestamp = Math.floor(nextSwitchDate.getTime() / 1000);
    const nowTimestamp    = Math.floor(now.getTime() / 1000);
    
    return json({
      success: true,
      data: {
        status: isActive ? 'AKTIV' : 'INAKTIV',
        is_active: isActive,
        timestamp: {
          current: nowTimestamp,
          next_switch: secondTimestamp
        },
        discord: {
            relative: `<t:${secondTimestamp}:R>`,
            full: `<t:${secondTimestamp}:f>`,
            short: `<t:${secondTimestamp}:t>`
        },
        seconds_remaining: Math.max(0, secondTimestamp - nowTimestamp)
      }
    });
  }
}
