import { createCabin, listCabins, getCabinBySlug, updateCabin, deleteCabin, getMyCabins, getCabinsByOwnerSlugService, getCabinsByCompanySlugService } from '../services/cabinService.js';
import { createCabinValidation, updateCabinValidation } from '../validators/cabinValidators.js';

export const create = async (req, res) => {
  try {
    const { error, value } = createCabinValidation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
      });
    }

    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const cabin = await createCabin(value, req.user);
    return res.status(201).json({ success: true, data: cabin });
  } catch (err) {
    // Map known errors to appropriate HTTP status codes
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbudt' });
    if (err.message === 'Owner not found') return res.status(404).json({ success: false, message: 'Eier ikke funnet' });
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Hytte med dette navnet finnes allerede' });
    // Default to 500 for unexpected server-side errors
    return res.status(500).json({ success: false, message: 'Intern serverfeil' });
  }
};

export const list = async (req, res) => {
  try {
    const { city, halfdayAvailability, ownerId, limit, page } = req.query;
    const result = await listCabins({
      city,
      halfdayAvailability: typeof halfdayAvailability !== 'undefined' ? halfdayAvailability === 'true' : undefined,
      ownerId,
      limit,
      page
    });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getBySlug = async (req, res) => {
  try {
    const cabin = await getCabinBySlug(req.params.slug);
    return res.status(200).json({ success: true, data: cabin });
  } catch (err) {
    return res.status(404).json({ success: false, message: 'Cabin not found' });
  }
};

export const update = async (req, res) => {
  try {
    // Validate input data
    const { error, value } = updateCabinValidation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
      });
    }

    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    const cabin = await updateCabin(req.params.slug, value, req.user);
    return res.status(200).json({ success: true, data: cabin });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbudt' });
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Hytte med dette navnet finnes allerede' });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Hytte ikke funnet' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const result = await deleteCabin(req.params.slug, req.user);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const listMyCabins = async (req, res) => {
  console.log('listMyCabins called'); 
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden' 
      });
    }

    const { limit = 20, page = 1 } = req.query;

    const result = await getMyCabins(req.user.userId, { limit, page });

    return res.status(200).json({ 
      success: true, 
      ...result 
    });
  } catch (err) {
    return res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};

export const getCabinsByOwnerSlug = async (req, res) => {
  try {
    const { ownerSlug } = req.params;
    const { city, halfdayAvailability, limit, page } = req.query;
    
    const result = await getCabinsByOwnerSlugService(ownerSlug, {
      city,
      halfdayAvailability: typeof halfdayAvailability !== 'undefined' ? halfdayAvailability === 'true' : undefined,
      limit,
      page
    });
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getCabinsByCompanySlug = async (req, res) => {
  try {
    const { companySlug } = req.params;
    const { city, halfdayAvailability, limit, page } = req.query;
    
    const result = await getCabinsByCompanySlugService(companySlug, {
      city,
      halfdayAvailability: typeof halfdayAvailability !== 'undefined' ? halfdayAvailability === 'true' : undefined,
      limit,
      page
    });
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

