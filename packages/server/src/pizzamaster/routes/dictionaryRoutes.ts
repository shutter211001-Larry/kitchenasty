import { Router } from 'express';
import {
  getActionGroups,
  getUnitGroups,
  createActionGroup,
  createAction,
  deleteActionGroup,
  deleteAction,
  setActionGroupDefaultUnits,
  setActionDefaultUnits,
  createUnitGroup,
  createUnit,
  deleteUnitGroup,
  deleteUnit
} from '../controllers/dictionaryController.js';

const router = Router();

// Action Groups
router.get('/actions', getActionGroups);
router.post('/actions/groups', createActionGroup);
router.delete('/actions/groups/:id', deleteActionGroup);
router.put('/actions/groups/:id/default-units', setActionGroupDefaultUnits);

// Actions
router.post('/actions', createAction);
router.delete('/actions/:id', deleteAction);
router.put('/actions/:id/default-units', setActionDefaultUnits);

// Unit Groups
router.get('/units', getUnitGroups);
router.post('/units/groups', createUnitGroup);
router.delete('/units/groups/:id', deleteUnitGroup);

// Units
router.post('/units', createUnit);
router.delete('/units/:id', deleteUnit);

export default router;
