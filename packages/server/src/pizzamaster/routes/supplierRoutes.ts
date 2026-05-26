import { Router } from 'express';
import { 
  getSuppliers, 
  createSupplier, 
  updateSupplier,
  deleteSupplier,
  getSupplierPrices,
  addSupplierPrice, 
  deleteSupplierPrice,
  setDefaultSupplierPrice
} from '../controllers/supplierController.js';

const router = Router();

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.patch('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

router.get('/:id/prices', getSupplierPrices);
router.post('/price', addSupplierPrice);
router.delete('/prices/:priceId', deleteSupplierPrice);
router.patch('/prices/:priceId/default', setDefaultSupplierPrice);

export default router;
