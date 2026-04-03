import { Router } from 'express';
import {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  softDeleteRecord,
  permanentlyDeleteRecord,
  getBulkRecords,
} from '../controller/financial-record.controller.js';
import { verifyToken, authorize, anyRole, onlyAnalystOrAdmin } from '../middleware/authMiddleware.js';
import { UserRole } from '../types/index.js';

const recordRouter = Router();

recordRouter.use(verifyToken);

recordRouter.post('/create', authorize(UserRole.ANALYST, UserRole.ADMIN), createRecord);

recordRouter.get('/', onlyAnalystOrAdmin, getRecords);

recordRouter.post('/bulk/fetch', onlyAnalystOrAdmin, getBulkRecords);

recordRouter.get('/:id', onlyAnalystOrAdmin, getRecordById);

recordRouter.put('/:id', authorize(UserRole.ANALYST, UserRole.ADMIN), updateRecord);


recordRouter.delete('/:id', authorize(UserRole.ANALYST, UserRole.ADMIN), softDeleteRecord);

recordRouter.delete('/:id/permanent', authorize(UserRole.ADMIN), permanentlyDeleteRecord);

export default recordRouter;
