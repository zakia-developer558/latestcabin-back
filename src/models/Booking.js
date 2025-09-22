import FirebaseModel from './firebaseModel.js';

class Booking extends FirebaseModel {
  constructor() {
    super('bookings');
    
    // Initialize query object to prevent undefined errors
    this.query = {
      sortField: null,
      sortDirection: 'asc',
      skipCount: 0,
      limitCount: 0
    };
  }

  // Override create to handle booking-specific logic
  async create(bookingData) {
    // Validate date range
    if (bookingData.startDate && bookingData.endDate && new Date(bookingData.endDate) <= new Date(bookingData.startDate)) {
      throw new Error('endDate must be after startDate');
    }

    // Set default values and ensure proper formatting
    const booking = {
      cabin: bookingData.cabin,
      user: bookingData.user,
      startDate: new Date(bookingData.startDate),
      endDate: new Date(bookingData.endDate),
      startDateTime: bookingData.startDateTime ? new Date(bookingData.startDateTime) : null,
      endDateTime: bookingData.endDateTime ? new Date(bookingData.endDateTime) : null,
      guestName: bookingData.guestName.trim(),
      guestAddress: bookingData.guestAddress.trim(),
      guestPostalCode: bookingData.guestPostalCode.trim(),
      guestCity: bookingData.guestCity.trim(),
      guestPhone: bookingData.guestPhone.trim(),
      guestEmail: bookingData.guestEmail.toLowerCase().trim(),
      guestAffiliation: bookingData.guestAffiliation ? bookingData.guestAffiliation.trim() : null,
      status: bookingData.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return super.create(booking);
  }

  // Override findByIdAndUpdate to handle booking-specific logic
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

const bookingModel = new Booking();
export default bookingModel;



