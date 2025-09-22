import FirebaseModel from './firebaseModel.js';

class Unavailability extends FirebaseModel {
  constructor() {
    super('unavailabilities');
    
    // Initialize query object to prevent undefined errors
    this.query = {
      sortField: null,
      sortDirection: 'asc',
      skipCount: 0,
      limitCount: 0
    };
  }

  // Override create to handle unavailability-specific logic
  async create(unavailabilityData) {
    // Validate date range
    if (unavailabilityData.startDate && unavailabilityData.endDate && 
        new Date(unavailabilityData.endDate) <= new Date(unavailabilityData.startDate)) {
      throw new Error('endDate must be after startDate');
    }

    // Set default values and ensure proper formatting
    const unavailability = {
      cabin: unavailabilityData.cabin,
      startDate: new Date(unavailabilityData.startDate),
      endDate: new Date(unavailabilityData.endDate),
      reason: unavailabilityData.reason ? unavailabilityData.reason.trim() : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return super.create(unavailability);
  }

  // Override findByIdAndUpdate to handle unavailability-specific logic
  async findByIdAndUpdate(id, updateData) {
    // Validate date range if both dates are being updated
    if (updateData.startDate && updateData.endDate && 
        new Date(updateData.endDate) <= new Date(updateData.startDate)) {
      throw new Error('endDate must be after startDate');
    }

    // Always update the updatedAt timestamp
    if (updateData.$set) {
      updateData.$set.updatedAt = new Date();
    } else {
      updateData.updatedAt = new Date();
    }

    return super.findByIdAndUpdate(id, updateData);
  }
}

const unavailabilityModel = new Unavailability();
export default unavailabilityModel;









