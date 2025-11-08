import Legend from '../models/Legend.js';

// Get all legends for a specific user (default legends + user's custom legends)
export const getUserLegends = async (userId) => {
  try {
    const legends = await Legend.find({
      $or: [
        { isDefault: true }, // All default legends
        { createdBy: userId } // User's custom legends
      ]
    });
    return legends;
  } catch (error) {
    throw new Error(`Failed to fetch user legends: ${error.message}`);
  }
};

// Get only company-specific legends (excluding defaults)
export const getCompanyOnlyLegends = async (companySlug) => {
  try {
    const legends = await Legend.findByCompanySlug(companySlug);
    // Filter out default legends (isDefault: true or companySlug: null)
    return legends.filter(legend => !legend.isDefault && legend.companySlug === companySlug);
  } catch (error) {
    throw new Error(`Failed to fetch company-only legends: ${error.message}`);
  }
};

// Get only active company-specific legends (excluding defaults)
export const getCompanyOnlyActiveLegends = async (companySlug) => {
  try {
    const legends = await Legend.findByCompanySlug(companySlug);
    // Filter out default legends and inactive legends
    return legends.filter(legend => 
      !legend.isDefault && 
      legend.companySlug === companySlug && 
      legend.isActive
    );
  } catch (error) {
    throw new Error(`Failed to fetch company-only active legends: ${error.message}`);
  }
};

// Get active legends for a specific user (default active legends + user's active custom legends)
export const getUserActiveLegends = async (userId) => {
  try {
    console.log('DEBUG - getUserActiveLegends called with userId:', userId);
    
    const legends = await Legend.find({
      isActive: true,
      $or: [
        { isDefault: true }, // All active default legends
        { createdBy: userId } // User's active custom legends
      ]
    });
    
    console.log('DEBUG - getUserActiveLegends query result:');
    console.log('- Total legends found:', legends.length);
    console.log('- Legends:', legends.map(l => ({ 
      name: l.name, 
      isDefault: l.isDefault, 
      createdBy: l.createdBy,
      isActive: l.isActive 
    })));
    
    return legends;
  } catch (error) {
    console.error('Error in getUserActiveLegends:', error);
    throw new Error(`Failed to fetch user active legends: ${error.message}`);
  }
};

// Get all legends (admin only - for backward compatibility)
export const getAllLegends = async () => {
  try {
    const legends = await Legend.find({});
    return legends;
  } catch (error) {
    throw new Error(`Failed to fetch legends: ${error.message}`);
  }
};

// Get active legends only (admin only - for backward compatibility)
export const getActiveLegends = async () => {
  try {
    const legends = await Legend.findActive();
    return legends;
  } catch (error) {
    throw new Error(`Failed to fetch active legends: ${error.message}`);
  }
};

// Get legends for a specific company (including defaults)
export const getCompanyLegends = async (companySlug) => {
  try {
    const legends = await Legend.findByCompanySlug(companySlug);
    return legends;
  } catch (error) {
    throw new Error(`Failed to fetch company legends: ${error.message}`);
  }
};

// Get active legends for a specific company (including defaults)
export const getCompanyActiveLegends = async (companySlug) => {
  try {
    const legends = await Legend.findByCompanySlug(companySlug);
    return legends.filter(legend => legend.isActive);
  } catch (error) {
    throw new Error(`Failed to fetch company active legends: ${error.message}`);
  }
};

// Get legend by ID
export const getLegendById = async (legendId) => {
  try {
    const legend = await Legend.findById(legendId);
    if (!legend) {
      throw new Error('Legend not found');
    }
    return legend;
  } catch (error) {
    throw new Error(`Failed to fetch legend: ${error.message}`);
  }
};

// Create new legend
export const createLegend = async (legendData, userId, userCompanySlug = null) => {
  try {
    // Validate required fields
    if (!legendData.name || !legendData.color) {
      throw new Error('Name and color are required fields');
    }

    // For custom legends (non-default), check if legend with same name already exists for this user
    if (!legendData.isDefault && userId) {
      const existingLegend = await Legend.findOne({ 
        name: legendData.name.trim(),
        createdBy: userId
      });
      if (existingLegend) {
        throw new Error('You already have a legend with this name');
      }
    }

    // For default legends, check global uniqueness
    if (legendData.isDefault) {
      const existingLegend = await Legend.findOne({ 
        name: legendData.name.trim(),
        isDefault: true
      });
      if (existingLegend) {
        throw new Error('Default legend with this name already exists');
      }
    }

    // Add user ID and company slug to legend data
    const legendWithUser = {
      ...legendData,
      createdBy: userId || null,
      companySlug: legendData.isDefault ? null : (legendData.companySlug || userCompanySlug) // Use provided companySlug or fallback to user's company
    };

    const legend = await Legend.create(legendWithUser);
    return legend;
  } catch (error) {
    throw new Error(`Failed to create legend: ${error.message}`);
  }
};

// Update existing legend
export const updateLegend = async (legendId, updateData) => {
  try {
    // Check if legend exists
    const existingLegend = await Legend.findById(legendId);
    if (!existingLegend) {
      throw new Error('Legend not found');
    }

    // Prevent updating default legends' core properties
    if (existingLegend.isDefault && (updateData.name || updateData.isDefault !== undefined)) {
      throw new Error('Cannot modify name or default status of system default legends');
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name.trim() !== existingLegend.name) {
      const nameConflict = await Legend.findOne({ 
        name: updateData.name.trim(),
        _id: { $ne: legendId }
      });
      if (nameConflict) {
        throw new Error('Legend with this name already exists');
      }
    }

    const updatedLegend = await Legend.findByIdAndUpdate(legendId, updateData);
    return updatedLegend;
  } catch (error) {
    throw new Error(`Failed to update legend: ${error.message}`);
  }
};

// Delete legend
export const deleteLegend = async (legendId) => {
  try {
    // Check if legend exists
    const existingLegend = await Legend.findById(legendId);
    if (!existingLegend) {
      throw new Error('Legend not found');
    }

    // Prevent deletion of default legends
    if (existingLegend.isDefault) {
      throw new Error('Cannot delete system default legends');
    }

    await Legend.findByIdAndDelete(legendId);
    return { message: 'Legend deleted successfully' };
  } catch (error) {
    throw new Error(`Failed to delete legend: ${error.message}`);
  }
};

// Toggle legend active status
export const toggleLegendStatus = async (legendId) => {
  try {
    const legend = await Legend.findById(legendId);
    if (!legend) {
      throw new Error('Legend not found');
    }

    const updatedLegend = await Legend.findByIdAndUpdate(
      legendId, 
      { isActive: !legend.isActive }
    );
    return updatedLegend;
  } catch (error) {
    throw new Error(`Failed to toggle legend status: ${error.message}`);
  }
};

// Initialize default legends (can be called during app startup)
export const initializeDefaultLegends = async () => {
  try {
    const defaultLegends = [
      {
        name: 'Booked',
        color: '#ef4444',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        isBookable: false,
        isActive: true,
        isDefault: true,
        description: 'Confirmed bookings'
      },
      {
        name: 'Maintenance',
        color: '#f59e0b',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        isBookable: false,
        isActive: true,
        isDefault: true,
        description: 'Maintenance periods'
      },
      {
        name: 'Unavailable',
        color: '#6b7280',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800',
        isBookable: false,
        isActive: true,
        isDefault: true,
        description: 'Unavailable periods'
      }
    ];

    for (const legendData of defaultLegends) {
      const existing = await Legend.findOne({ name: legendData.name, isDefault: true });
      if (!existing) {
        await Legend.create(legendData);
      }
    }

    return { message: 'Default legends initialized successfully' };
  } catch (error) {
    throw new Error(`Failed to initialize default legends: ${error.message}`);
  }
};