/**
 * Utility functions for generating slugs
 */

/**
 * Generate a slug from user's first name and last name
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @returns {string} - Generated slug
 */
export const generateUserSlug = (firstName, lastName) => {
  const fullName = `${firstName} ${lastName}`;
  return fullName
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Generate a unique slug by appending numbers if needed
 * @param {string} baseSlug - Base slug to make unique
 * @param {Function} checkExistence - Function to check if slug exists (should return boolean)
 * @returns {Promise<string>} - Unique slug
 */
export const generateUniqueSlug = async (baseSlug, checkExistence) => {
  let slug = baseSlug;
  let suffix = 1;

  // Keep checking and incrementing until we find a unique slug
  while (await checkExistence(slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }

  return slug;
};

/**
 * General purpose slug generator (similar to cabin service)
 * @param {string} text - Text to convert to slug
 * @returns {string} - Generated slug
 */
export const generateSlug = (text) => {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};