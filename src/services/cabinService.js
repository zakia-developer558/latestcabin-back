import Cabin from '../models/Cabin.js';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import { sendCabinCreatedEmail } from '../utils/notificationEmails.js';
import { generateSlug } from '../utils/slugUtils.js';

export const createCabin = async (payload, ownerUser) => {
  try {
    // Fetch owner's slug from User model
    const owner = await User.findById(ownerUser.userId);
    if (!owner) {
      throw new Error('Owner not found');
    }

    const baseSlug = generateSlug(payload.name);
    // Prevent creating cabins with unusable slug (e.g., name with only punctuation)
    if (!baseSlug || baseSlug.length === 0) {
      const err = new Error('Ugyldig hyttenavn: må inneholde bokstaver eller tall');
      err.status = 400;
      throw err;
    }
    let slug = baseSlug;
    let suffix = 1;

    // ensure unique slug
    while (await Cabin.findOne({ slug })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const nextId = await Counter.getNextSequence('cabin_id');

    const cabin = await Cabin.create({
      id: nextId,
      owner: ownerUser.userId,
      ownerSlug: owner.slug,
      companySlug: owner.companySlug,
      name: payload.name,
      slug,
      address: payload.address,
      postal_code: payload.postal_code,
      city: payload.city,
      phone: payload.phone,
      email: payload.email,
      contact_person_name: payload.contact_person_name,
      image: payload.image,
      color: payload.color,
      halfdayAvailability: payload.halfdayAvailability ?? false,
      fullDayStartTime: payload.fullDayStartTime || null,
      fullDayEndTime: payload.fullDayEndTime || null,
      firstHalfStartTime: payload.firstHalfStartTime || null,
      firstHalfEndTime: payload.firstHalfEndTime || null,
      secondHalfStartTime: payload.secondHalfStartTime || null,
      secondHalfEndTime: payload.secondHalfEndTime || null,
      affiliations: payload.affiliations || []
    });
    
    // Send cabin creation email to owner (non-blocking)
    try {
      await sendCabinCreatedEmail(owner.email, owner.firstName, cabin);
    } catch (e) {
      console.warn('E-postoppretting av hytta mislyktes:', e?.message || e);
    }

    return cabin;
  } catch (error) {
    throw error;
  }
};

export const listCabins = async ({ city, halfdayAvailability, ownerId, limit = 20, page = 1 }) => {
  const filter = {};
  if (city) filter.city = city;
  if (typeof halfdayAvailability === 'boolean') filter.halfdayAvailability = halfdayAvailability;
  if (ownerId) filter.owner = ownerId;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Cabin.find(filter, { sort: { createdAt: -1 }, skip, limit: Number(limit) }),
    Cabin.countDocuments(filter)
  ]);

  return { items, total, page: Number(page), limit: Number(limit) };
};

export const getCabinBySlug = async (slug) => {
  // Try exact match first
  let cabin = await Cabin.findOne({ slug });
  if (cabin) return cabin;

  // Fallback: normalize incoming slug (strip unsafe characters, lowercase)
  const normalized = generateSlug(slug);
  if (normalized !== slug) {
    cabin = await Cabin.findOne({ slug: normalized });
    if (cabin) return cabin;
  }

  throw new Error('Cabin not found');
};

export const updateCabin = async (slug, updates, ownerUser) => {
  const cabin = await Cabin.findOne({ slug });
  if (!cabin) throw new Error('Cabin not found');
  if (String(cabin.owner) !== String(ownerUser.userId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  // Regenerate slug if name changes
  if (updates.name && updates.name !== cabin.name) {
    const baseSlug = generateSlug(updates.name);
    let newSlug = baseSlug;
    let suffix = 1;
    while (await Cabin.findOne({ slug: newSlug, _id: { $ne: cabin._id } })) {
      newSlug = `${baseSlug}-${suffix++}`;
    }
    cabin.slug = newSlug;
    cabin.name = updates.name;
  }

  await Cabin.findByIdAndUpdate(cabin._id, {
    address: updates.address ?? cabin.address,
    postal_code: updates.postal_code ?? cabin.postal_code,
    city: updates.city ?? cabin.city,
    phone: updates.phone ?? cabin.phone,
    email: updates.email ?? cabin.email,
    contact_person_name: updates.contact_person_name ?? cabin.contact_person_name,
    image: updates.image ?? cabin.image,
    color: updates.color ?? cabin.color,
    halfdayAvailability: typeof updates.halfdayAvailability === 'boolean' ? updates.halfdayAvailability : cabin.halfdayAvailability,
    fullDayStartTime: updates.fullDayStartTime ?? cabin.fullDayStartTime,
    fullDayEndTime: updates.fullDayEndTime ?? cabin.fullDayEndTime,
    firstHalfStartTime: updates.firstHalfStartTime ?? cabin.firstHalfStartTime,
    firstHalfEndTime: updates.firstHalfEndTime ?? cabin.firstHalfEndTime,
    secondHalfStartTime: updates.secondHalfStartTime ?? cabin.secondHalfStartTime,
    secondHalfEndTime: updates.secondHalfEndTime ?? cabin.secondHalfEndTime,
    affiliations: updates.affiliations ?? cabin.affiliations,
    slug: cabin.slug,
    name: cabin.name
  });
  
  // Return updated cabin
  return await Cabin.findById(cabin._id);
};

export const deleteCabin = async (slug, ownerUser) => {
  const cabin = await Cabin.findOne({ slug });
  if (!cabin) throw new Error('Cabin not found');
  if (String(cabin.owner) !== String(ownerUser.userId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  await cabin.deleteOne();
  return { message: 'Cabin deleted' };
};

export const getMyCabins = async (ownerId, filters = {}) => {
  try {
    const { city, halfdayAvailability, limit = 10, page = 1 } = filters;
    
    // Build query
    const query = { owner: ownerId };
    
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    
    if (typeof halfdayAvailability === 'boolean') {
      query.halfdayAvailability = halfdayAvailability;
    }
    
    const skip = (page - 1) * limit;
    
    // Set pagination properties on the Cabin model (without sorting to avoid index requirement)
    Cabin.query.skipCount = skip;
    Cabin.query.limitCount = parseInt(limit);
    Cabin.query.sortField = null;
    Cabin.query.sortDirection = 'asc';
    
    const cabins = await Cabin.find(query);
    const total = await Cabin.countDocuments(query);
    
    return {
      data: cabins,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: cabins.length,
        totalRecords: total
      }
    };
  } catch (error) {
    throw error;
  }
};

export const getCabinsByOwnerSlugService = async (ownerSlug, filters = {}) => {
  try {
    const { city, halfdayAvailability, limit = 10, page = 1 } = filters;
    
    // Build query using ownerSlug instead of owner ID
    const query = { ownerSlug: ownerSlug };
    
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    
    if (typeof halfdayAvailability === 'boolean') {
      query.halfdayAvailability = halfdayAvailability;
    }
    
    const skip = (page - 1) * limit;
    
    // Set pagination properties on the Cabin model (without sorting to avoid index requirement)
    Cabin.query.skipCount = skip;
    Cabin.query.limitCount = parseInt(limit);
    Cabin.query.sortField = null;
    Cabin.query.sortDirection = 'asc';
    
    const cabins = await Cabin.find(query);
    const total = await Cabin.countDocuments(query);
    
    return {
      data: cabins,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: cabins.length,
        totalRecords: total
      }
    };
  } catch (error) {
    throw error;
  }
};

export const getCabinsByCompanySlugService = async (companySlug, filters = {}) => {
  try {
    const { city, halfdayAvailability, limit = 10, page = 1 } = filters;
    
    // Build query using companySlug instead of owner ID
    const query = { companySlug: companySlug };
    
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    
    if (typeof halfdayAvailability === 'boolean') {
      query.halfdayAvailability = halfdayAvailability;
    }
    
    const skip = (page - 1) * limit;
    
    // Set pagination properties on the Cabin model (without sorting to avoid index requirement)
    Cabin.query.skipCount = skip;
    Cabin.query.limitCount = parseInt(limit);
    Cabin.query.sortField = null;
    Cabin.query.sortDirection = 'asc';
    
    const cabins = await Cabin.find(query);
    const total = await Cabin.countDocuments(query);
    
    return {
      data: cabins,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: cabins.length,
        totalRecords: total
      }
    };
  } catch (error) {
    throw error;
  }
};

