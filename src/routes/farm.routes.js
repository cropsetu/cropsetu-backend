/**
 * Farm Routes — Multi-farm CRUD
 */
import { Router } from 'express';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/response.js';
import logger from '../utils/logger.js';
import { createFarm, listFarms, getFarmDetail, updateFarm, deleteFarm, setActiveFarm } from '../services/farm.service.js';

const router = Router();
router.use(authenticate);

const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyGenerator: r => r.user?.id || r.ip });

const OPT = { values: 'falsy' }; // skip validation for null, "", undefined, 0
const farmValidators = [
  body('farmName').optional(OPT).trim().isLength({ max: 100 }),
  body('village').optional(OPT).trim().isLength({ max: 100 }),
  body('taluka').optional(OPT).trim().isLength({ max: 100 }),
  body('district').optional(OPT).trim().isLength({ max: 100 }),
  body('pincode').optional(OPT).matches(/^\d{6}$/),
  body('latitude').optional(OPT).isFloat({ min: 6, max: 38 }),
  body('longitude').optional(OPT).isFloat({ min: 68, max: 98 }),
  body('landSizeAcres').optional(OPT).isFloat({ min: 0.01, max: 10000 }),
  body('soilType').optional(OPT).isIn(['BLACK_COTTON', 'RED', 'ALLUVIAL', 'SANDY', 'LATERITE', 'CLAY_LOAM', 'SANDY_LOAM', 'UNKNOWN']),
  body('irrigationSystem').optional(OPT).isIn(['DRIP', 'SPRINKLER', 'FLOOD', 'FURROW', 'RAINFED', 'MIXED']),
];

router.get('/', async (req, res) => {
  try { return sendSuccess(res, await listFarms(req.user.id)); }
  catch (e) { logger.error({ err: e }, '[Farm] list'); return sendError(res, 'Failed', 500); }
});

router.post('/', writeLimit, [body('landSizeAcres').notEmpty().isFloat({ min: 0.01 }), ...farmValidators], validate, async (req, res) => {
  try { return sendCreated(res, await createFarm(req.user.id, req.body)); }
  catch (e) { logger.error({ err: e }, '[Farm] create'); return sendError(res, e.message || 'Failed', 500); }
});

router.get('/:farmId', [param('farmId').isUUID()], validate, async (req, res) => {
  try {
    const farm = await getFarmDetail(req.params.farmId, req.user.id);
    return farm ? sendSuccess(res, farm) : sendNotFound(res, 'Farm');
  } catch (e) { logger.error({ err: e }, '[Farm] get'); return sendError(res, 'Failed', 500); }
});

router.patch('/:farmId', writeLimit, [param('farmId').isUUID(), ...farmValidators], validate, async (req, res) => {
  try { return sendSuccess(res, await updateFarm(req.params.farmId, req.user.id, req.body)); }
  catch (e) { logger.error({ err: e }, '[Farm] update'); return sendError(res, 'Failed', 500); }
});

router.delete('/:farmId', writeLimit, [param('farmId').isUUID()], validate, async (req, res) => {
  try { await deleteFarm(req.params.farmId, req.user.id); return sendSuccess(res, { deleted: true }); }
  catch (e) { logger.error({ err: e }, '[Farm] delete'); return sendError(res, 'Failed', 500); }
});

router.post('/active', [body('farmId').notEmpty().isUUID()], validate, async (req, res) => {
  try {
    const farm = await setActiveFarm(req.user.id, req.body.farmId);
    return farm ? sendSuccess(res, { activeFarmId: farm.id }) : sendNotFound(res, 'Farm');
  } catch (e) { logger.error({ err: e }, '[Farm] setActive'); return sendError(res, 'Failed', 500); }
});

export default router;
