import { Router } from 'express';
import { 
  getLabelManufacturers, 
  createLabelManufacturer, 
  updateLabelManufacturer, 
  deleteLabelManufacturer 
} from '../controllers/labelManufacturerController.js';

const router = Router();

router.get('/', getLabelManufacturers);
router.post('/', createLabelManufacturer);
router.put('/:id', updateLabelManufacturer);
router.delete('/:id', deleteLabelManufacturer);

export default router;
