import { upsertNotesValidation } from '../validators/noteValidators.js';
import { upsertCabinDayNotes } from '../services/notesService.js';

export const upsertCabinNotes = async (req, res) => {
  try {
    const { error, value } = upsertNotesValidation(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details });
    }
    const result = await upsertCabinDayNotes(req.params.cabinId, value.notes, req.user);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};