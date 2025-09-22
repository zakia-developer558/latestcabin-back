import { createCabin, listCabins, getCabinBySlug, updateCabin, deleteCabin, getMyCabins, getCabinsByOwnerSlugService } from '../services/cabinService.js';
import { createCabinValidation } from '../validators/cabinValidators.js';

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
    if (err.code === 11000) {
      // duplicate key (name or slug)
      return res.status(409).json({ success: false, message: 'Cabin with this name already exists' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const list = async (req, res) => {
  try {
    const { city, is_member, ownerId, limit, page } = req.query;
    const result = await listCabins({
      city,
      is_member: typeof is_member !== 'undefined' ? is_member === 'true' : undefined,
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
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const cabin = await updateCabin(req.params.slug, req.body, req.user);
    return res.status(200).json({ success: true, data: cabin });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Cabin with this name already exists' });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
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
    const { city, is_member, limit, page } = req.query;
    
    const result = await getCabinsByOwnerSlugService(ownerSlug, {
      city,
      is_member: typeof is_member !== 'undefined' ? is_member === 'true' : undefined,
      limit,
      page
    });
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

