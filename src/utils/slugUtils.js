/**
 * Utility functions for generating slugs
 */

/**
 * Transliterate common Norwegian letters to ASCII-friendly equivalents.
 * - ø/Ø → o
 * - å/Å → a
 * - æ/Æ → ae
 * Also strips general diacritics (e.g., é → e) using Unicode normalization.
 */
const transliterateNo = (input) => {
  if (!input) return '';
  // Remove general diacritics
  let s = input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  // Explicit Norwegian mappings
  s = s.replace(/[æÆ]/g, 'ae').replace(/[øØ]/g, 'o').replace(/[åÅ]/g, 'a');
  return s;
};

/**
 * Generate a slug from user's first name and last name
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @returns {string} - Generated slug
 */
export const generateUserSlug = (firstName, lastName) => {
  const fullName = transliterateNo(`${firstName} ${lastName}`);
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
 * Generate a slug from company name
 * @param {string} companyName - Company name
 * @returns {string} - Generated slug
 */
export const generateCompanySlug = (companyName) => {
  return transliterateNo(companyName)
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * General purpose slug generator (similar to cabin service)
 * @param {string} text - Text to convert to slug
 * @returns {string} - Generated slug
 */
export const generateSlug = (text) => {
  return transliterateNo(text)
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};
