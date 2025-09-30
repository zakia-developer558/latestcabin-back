import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import {
  getLegends,
  getLegend,
  createNewLegend,
  updateExistingLegend,
  removeLegend,
  toggleLegend,
  initDefaults,
  getPublicLegends,
  getPublicLegendById,
  getCabinLegends,
  getCompanySpecificLegends
} from '../controllers/legendController.js';
import {
  createLegendValidation,
  updateLegendValidation,
  legendIdValidation,
  legendQueryValidation
} from '../validators/legendValidators.js';

const router = express.Router();

// GET /legends/public - Get all legends (public endpoint - no authentication required)
router.get('/public', legendQueryValidation, getPublicLegends);

// GET /legends/public/:id - Get legend by ID (public endpoint - no authentication required)
router.get('/public/:id', legendIdValidation, getPublicLegendById);

// GET /legends/cabin/:slug - Get legends for a specific cabin based on its company slug
router.get('/cabin/:slug', legendQueryValidation, getCabinLegends);

// GET /legends/company/:companySlug - Get only company-specific legends (excluding defaults)
router.get('/company/:companySlug', legendQueryValidation, getCompanySpecificLegends);

// GET /legends - Get all legends or active legends (requires authentication for user-specific filtering)
router.get('/', authenticate, legendQueryValidation, getLegends);

// GET /legends/:id - Get legend by ID
router.get('/:id', legendIdValidation, getLegend);

// POST /legends - Create new legend (requires authentication and owner authorization)
router.post('/', authenticate, authorize('owner'), createLegendValidation, createNewLegend);

// PUT /legends/:id - Update legend (requires authentication and owner authorization)
router.put('/:id', authenticate, authorize('owner'), legendIdValidation, updateLegendValidation, updateExistingLegend);

// DELETE /legends/:id - Delete legend (requires authentication and owner authorization)
router.delete('/:id', authenticate, authorize('owner'), legendIdValidation, removeLegend);

// PATCH /legends/:id/toggle - Toggle legend active status (requires authentication and owner authorization)
router.patch('/:id/toggle', authenticate, authorize('owner'), legendIdValidation, toggleLegend);

// POST /legends/init-defaults - Initialize default legends (admin only)
router.post('/init-defaults', authenticate, authorize('owner'), initDefaults);

export default router;