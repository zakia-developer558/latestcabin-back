import { createLegendValidation, updateLegendValidation } from '../validators/legendValidators.js';
import { 
  getAllLegends, 
  getActiveLegends,
  getUserLegends,
  getUserActiveLegends,
  getCompanyLegends,
  getCompanyActiveLegends,
  getCompanyOnlyLegends,
  getCompanyOnlyActiveLegends,
  getLegendById, 
  createLegend, 
  updateLegend, 
  deleteLegend, 
  toggleLegendStatus,
  initializeDefaultLegends 
} from '../services/legendService.js';
import { getCabinBySlug } from '../services/cabinService.js';

// GET - Fetch legend by ID (public endpoint - no authentication required)
export const getPublicLegendById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const legend = await getLegendById(id);
    
    if (!legend) {
      return res.status(404).json({ 
        success: false, 
        message: 'Legend not found' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      data: legend 
    });
  } catch (err) {
    console.error('Error in getPublicLegendById:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// GET - Get only company-specific legends (excluding defaults) by company slug
export const getCompanySpecificLegends = async (req, res) => {
  try {
    const { companySlug } = req.params;
    const { active } = req.query;

    let legends;
    if (active === 'true') {
      legends = await getCompanyOnlyActiveLegends(companySlug);
    } else {
      legends = await getCompanyOnlyLegends(companySlug);
    }

    return res.status(200).json({
      success: true,
      data: legends
    });
  } catch (err) {
    console.error('Error fetching company-only legends:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// GET - Fetch all legends (public endpoint - no authentication required)
export const getPublicLegends = async (req, res) => {
  try {
    const { active } = req.query;
    
    let legends;
    if (active === 'true') {
      // Get only active legends for public access
      legends = await getActiveLegends();
    } else {
      // Get all legends for public access
      legends = await getAllLegends();
    }
    
    return res.status(200).json({ 
      success: true, 
      data: legends 
    });
  } catch (err) {
    console.error('Error in getPublicLegends:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// GET - Fetch all legends
export const getLegends = async (req, res) => {
  try {
    const { active } = req.query;
    const userId = req.user?.userId; // Get user ID from authenticated request
    
    // Debug logging
    console.log('DEBUG - getLegends:');
    console.log('- req.user:', req.user);
    console.log('- userId:', userId);
    console.log('- active query:', active);
    
    let legends;
    if (userId) {
      // If user is authenticated, show user-specific legends
      if (active === 'true') {
        console.log('- Calling getUserActiveLegends with userId:', userId);
        legends = await getUserActiveLegends(userId);
        console.log('- getUserActiveLegends returned:', legends.length, 'legends');
      } else {
        legends = await getUserLegends(userId);
      }
    } else {
      // If no user (public access), show only default legends
      if (active === 'true') {
        legends = await getActiveLegends();
      } else {
        legends = await getAllLegends();
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      data: legends 
    });
  } catch (err) {
    console.error('Error in getLegends:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// GET - Fetch legend by ID
export const getLegend = async (req, res) => {
  try {
    const { id } = req.params;
    const legend = await getLegendById(id);
    
    return res.status(200).json({ 
      success: true, 
      data: legend 
    });
  } catch (err) {
    if (err.message === 'Legend not found') {
      return res.status(404).json({ 
        success: false, 
        message: 'Legend not found' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// POST - Create new legend
export const createNewLegend = async (req, res) => {
  try {
    const userId = req.user?.userId; // Get user ID from authenticated request
    const userCompanySlug = req.user?.companySlug; // Get company slug from authenticated request
    const legend = await createLegend(req.body, userId, userCompanySlug);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Legend created successfully',
      data: legend 
    });
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('already have')) {
      return res.status(409).json({ 
        success: false, 
        message: err.message 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// PUT - Update existing legend
export const updateExistingLegend = async (req, res) => {
  try {
    const { id } = req.params;
    const legend = await updateLegend(id, req.body);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Legend updated successfully',
      data: legend 
    });
  } catch (err) {
    if (err.message === 'Legend not found') {
      return res.status(404).json({ 
        success: false, 
        message: err.message 
      });
    }
    
    if (err.message.includes('already exists')) {
      return res.status(409).json({ 
        success: false, 
        message: err.message 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// DELETE - Remove legend
export const removeLegend = async (req, res) => {
  try {
    const { id } = req.params;
    const legend = await deleteLegend(id);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Legend deleted successfully',
      data: legend 
    });
  } catch (err) {
    if (err.message === 'Legend not found') {
      return res.status(404).json({ 
        success: false, 
        message: err.message 
      });
    }
    
    if (err.message.includes('cannot be deleted')) {
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// PATCH - Toggle legend active status
export const toggleLegend = async (req, res) => {
  try {
    const { id } = req.params;
    const legend = await toggleLegendStatus(id);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Legend status toggled successfully',
      data: legend 
    });
  } catch (err) {
    if (err.message === 'Legend not found') {
      return res.status(404).json({ 
        success: false, 
        message: err.message 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// POST - Initialize default legends (admin only)
export const initDefaults = async (req, res) => {
  try {
    const result = await initializeDefaultLegends();
    
    return res.status(200).json({ 
      success: true, 
      message: result.message 
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// GET - Fetch legends for a specific cabin based on its company slug
export const getCabinLegends = async (req, res) => {
  try {
    const { slug } = req.params;
    const { active } = req.query;
    
    // Get cabin details to extract company slug
    const cabin = await getCabinBySlug(slug);
    if (!cabin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cabin not found' 
      });
    }
    
    let legends;
    if (active === 'true') {
      // Get only active legends for the cabin's company
      legends = await getCompanyActiveLegends(cabin.companySlug);
    } else {
      // Get all legends for the cabin's company
      legends = await getCompanyLegends(cabin.companySlug);
    }
    
    return res.status(200).json({ 
      success: true, 
      data: legends 
    });
  } catch (err) {
    console.error('Error in getCabinLegends:', err);
    if (err.message === 'Cabin not found') {
      return res.status(404).json({ 
        success: false, 
        message: 'Cabin not found' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};