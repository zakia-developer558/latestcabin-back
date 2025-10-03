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
    // Normalize affiliations input: array of unique, trimmed, non-empty strings
    const sanitizeAffiliations = (list) => {
      if (!list) return [];
      const arr = Array.isArray(list) ? list : [list];
      const cleaned = arr
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v && v.length > 0)
        .slice(0, 50); // cap at 50 affiliations to avoid oversized docs
      // Ensure uniqueness (case-insensitive)
      const seen = new Set();
      const out = [];
      for (const item of cleaned) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(item);
        }
      }
      return out;
    };

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
      affiliations: sanitizeAffiliations(cabinData.affiliations),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return super.create(cabin);
  }

  // Override findByIdAndUpdate to handle cabin-specific logic
  async findByIdAndUpdate(id, updateData) {
    // Allow updating affiliations with same sanitization
    const sanitizeAffiliations = (list) => {
      if (!list) return [];
      const arr = Array.isArray(list) ? list : [list];
      const cleaned = arr
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v && v.length > 0)
        .slice(0, 50);
      const seen = new Set();
      const out = [];
      for (const item of cleaned) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(item);
        }
      }
      return out;
    };

    // Always update the updatedAt timestamp
    if (updateData.$set) {
      updateData.$set.updatedAt = new Date();
      if (updateData.$set.affiliations !== undefined) {
        updateData.$set.affiliations = sanitizeAffiliations(updateData.$set.affiliations);
      }
    } else {
      updateData.updatedAt = new Date();
      if (updateData.affiliations !== undefined) {
        updateData.affiliations = sanitizeAffiliations(updateData.affiliations);
      }
    }

    return super.findByIdAndUpdate(id, updateData);
  }
}

const cabinModel = new Cabin();
export default cabinModel;



