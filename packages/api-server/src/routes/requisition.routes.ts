import { Router } from "express";
import {
  getBranchInventory,
  getBranchRequisitions,
  createRequisition,
  receiveRequisition,
  getTenantIngredients,
} from "../controllers/requisition.controller";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate as any);

router.get("/ingredients", getTenantIngredients);
router.get("/inventory", getBranchInventory);
router.get("/", getBranchRequisitions);
router.post("/", createRequisition);
router.post("/:id/receive", receiveRequisition);

export default router;
