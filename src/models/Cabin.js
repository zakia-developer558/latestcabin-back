import FirebaseModel from './firebaseModel.js';

class Cabin extends FirebaseModel {
  constructor() {
    super('cabins');
    
    // Initialize query object to prevent undefined errors
    this.query = {
      sortField: null,
      sortDirection: 'asc',
      skipCount: 0,
      limitCount: 0
    };
  }

  // Override create to handle cabin-specific logic
  async create(cabinData) {
    // Set default values and ensure proper formatting
    const cabin = {
      id: cabinData.id,
      owner: cabinData.owner,
      ownerSlug: cabinData.ownerSlug,
      companySlug: cabinData.companySlug,
      name: cabinData.name,
      slug: cabinData.slug.toLowerCase().trim(),
      address: cabinData.address.trim(),
      postal_code: cabinData.postal_code.trim(),
      city: cabinData.city.trim(),
      phone: cabinData.phone || null,
      email: cabinData.email ? cabinData.email.toLowerCase().trim() : null,
      contact_person_name: cabinData.contact_person_name ? cabinData.contact_person_name.trim() : null,
      image: cabinData.image || null,
      color: cabinData.color || '#3B82F6',
      halfdayAvailability: cabinData.halfdayAvailability || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return super.create(cabin);
  }

  // Override findByIdAndUpdate to handle cabin-specific logic
  async findByIdAndUpdate(id, updateData) {
    // Always update the updatedAt timestamp
    if (updateData.$set) {
      updateData.$set.updatedAt = new Date();
    } else {
      updateData.updatedAt = new Date();
    }

    return super.findByIdAndUpdate(id, updateData);
  }
}

const cabinModel = new Cabin();
export default cabinModel;



