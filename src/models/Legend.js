import FirebaseModel from './firebaseModel.js';

class Legend extends FirebaseModel {
  constructor() {
    super('legends');
    
    // Initialize query object to prevent undefined errors
    this.query = {
      sortField: null,
      sortDirection: 'asc',
      skipCount: 0,
      limitCount: 0
    };
  }

  // Override create to handle legend-specific logic
  async create(legendData) {
    // Validate required fields
    if (!legendData.name || !legendData.color) {
      throw new Error('Name and color are required fields');
    }

    // Validate color format (hex color)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(legendData.color)) {
      throw new Error('Color must be a valid hex color code (e.g., #ffffff)');
    }

    // Set default values and ensure proper formatting
    const legend = {
      name: legendData.name.trim(),
      color: legendData.color.toLowerCase(),
      bgColor: legendData.bgColor || 'bg-gray-100',
      borderColor: legendData.borderColor || 'border-gray-200',
      textColor: legendData.textColor || 'text-gray-800',
      isActive: legendData.isActive !== undefined ? legendData.isActive : true,
      isDefault: legendData.isDefault || false,
      description: legendData.description || '',
      companySlug: legendData.companySlug || null, // Company slug for company-specific legends
      createdBy: legendData.createdBy || null, // User ID who created this legend
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return super.create(legend);
  }

  // Override findByIdAndUpdate to handle legend-specific logic
  async findByIdAndUpdate(id, updateData) {
    // Validate color format if color is being updated
    if (updateData.color) {
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(updateData.color)) {
        throw new Error('Color must be a valid hex color code (e.g., #ffffff)');
      }
      updateData.color = updateData.color.toLowerCase();
    }

    // Trim name if being updated
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }

    // Always update the updatedAt timestamp
    if (updateData.$set) {
      updateData.$set.updatedAt = new Date();
    } else {
      updateData.updatedAt = new Date();
    }

    return super.findByIdAndUpdate(id, updateData);
  }

  // Get all active legends
  async findActive() {
    return this.find({ isActive: true });
  }

  // Get legends for a specific company (including defaults)
  async findByCompanySlug(companySlug) {
    // Get both default legends and company-specific legends
    return this.find({
      $or: [
        { isDefault: true, isActive: true },
        { companySlug: companySlug, isActive: true }
      ]
    });
  }

  // Get default legends
  async findDefaults() {
    return this.find({ isDefault: true });
  }

  // Prevent deletion of default legends
  async deleteOne(filter) {
    const legend = await this.findOne(filter);
    if (legend && legend.isDefault) {
      throw new Error('Cannot delete default legends');
    }
    return super.deleteOne(filter);
  }
}

const legendModel = new Legend();
export default legendModel;