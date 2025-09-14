import { Router } from 'express';
import { EventsController } from '../controllers/events.controller';

const router = Router();

router.get('/fiestas', EventsController.getFiestas);

router.get('/festivales', EventsController.getFestivales);

router.get('/all', EventsController.getAllEvents);

router.get('/:type', EventsController.getEventsByType);

export default router;