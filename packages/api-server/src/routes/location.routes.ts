import { Router } from 'express';
import {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  getAvailableSlots,
} from '../controllers/location.controller.js';
import {
  listDeliveryZones,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
  checkDeliveryZone,
} from '../controllers/delivery-zone.controller.js';
import {
  listTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
} from '../controllers/table.controller.js';
import { authenticate, requireStaff, requireRole, optionalAuthenticate, requireLocationAccess } from '../middleware/auth.js';

const router = Router();

// Locations - read is open, write requires staff
router.get('/', optionalAuthenticate, listLocations);
router.get('/:id', optionalAuthenticate, getLocation);
router.get('/:id/available-slots', getAvailableSlots);
router.post('/', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), createLocation);
router.patch('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), requireLocationAccess((req: any) => req.params.id), updateLocation);
router.delete('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteLocation);

// Delivery zones - nested under locations
router.get('/:locationId/delivery-zones/check', checkDeliveryZone);
router.get('/:locationId/delivery-zones', optionalAuthenticate, listDeliveryZones);
router.post('/:locationId/delivery-zones', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), requireLocationAccess((req: any) => req.params.locationId), createDeliveryZone);
router.patch('/:locationId/delivery-zones/:zoneId', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), requireLocationAccess((req: any) => req.params.locationId), updateDeliveryZone);
router.delete('/:locationId/delivery-zones/:zoneId', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteDeliveryZone);

// Tables - nested under locations
router.get('/:locationId/tables', optionalAuthenticate, listTables);
router.get('/:locationId/tables/:tableId', optionalAuthenticate, getTable);
router.post('/:locationId/tables', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), requireLocationAccess((req: any) => req.params.locationId), createTable);
router.patch('/:locationId/tables/:tableId', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), requireLocationAccess((req: any) => req.params.locationId), updateTable);
router.delete('/:locationId/tables/:tableId', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteTable);

export default router;
