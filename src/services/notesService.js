import Cabin from '../models/Cabin.js';
import CabinDayNote from '../models/CabinDayNote.js';

// Use deterministic doc IDs to ensure uniqueness per (cabin, date)
const makeNoteId = (cabinId, date) => `${cabinId}_${date}`;

export const upsertCabinDayNotes = async (cabinId, notes, user) => {
  const cabin = await Cabin.findById(cabinId);
  if (!cabin) throw new Error('Cabin not found');
  if (!user || String(cabin.owner) !== String(user.userId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  let saved = 0;
  let cleared = 0;
  const updated = [];

  for (const entry of notes) {
    const date = entry.date.trim();
    const noteRaw = entry.note;
    const note = typeof noteRaw === 'string' ? noteRaw.trim() : noteRaw;
    const legendId = entry.legendId || null;
    const id = makeNoteId(cabin._id, date);

    if (!note) {
      // Delete/clear
      const existing = await CabinDayNote.findById(id);
      if (existing) {
        await CabinDayNote.findByIdAndDelete(id);
        cleared++;
      }
      updated.push({ date, note: null, legendId: null });
      continue;
    }

    const payload = {
      _id: id,
      cabin: cabin._id,
      date,
      note,
      legendId,
      updatedBy: user.userId,
      updatedAt: new Date()
    };

    await CabinDayNote.create(payload);
    saved++;
    updated.push({ date, note, legendId });
  }

  return { success: true, data: { saved, cleared, updated } };
};

export const getNotesForMonth = async (cabinId, year, month) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // Firestore has limited range queries with multiple fields; fetch all notes for cabin and filter by date string
  const all = await CabinDayNote.find({ cabin: cabinId });
  const within = all.filter(n => {
    const d = new Date(n.date + 'T00:00:00Z');
    return d >= start && d <= end;
  });
  const map = {};
  within.forEach(n => { map[n.date] = { note: n.note || null, legendId: n.legendId || null }; });
  return map;
};

export const getAllNotesForCabin = async (cabinId) => {
  const all = await CabinDayNote.find({ cabin: cabinId });
  return all.map(n => ({ date: n.date, note: n.note || null, legendId: n.legendId || null }));
};

// Upsert legend assignments for specific dates (without notes)
export const upsertLegendAssignments = async (cabinId, dates, legendId, user) => {
  const cabin = await Cabin.findById(cabinId);
  if (!cabin) throw new Error('Cabin not found');
  if (!user || String(cabin.owner) !== String(user.userId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  let saved = 0;
  const updated = [];

  for (const date of dates) {
    const d = date.trim();
    const id = makeNoteId(cabin._id, d);
    const payload = {
      _id: id,
      cabin: cabin._id,
      date: d,
      legendId,
      updatedBy: user.userId,
      updatedAt: new Date()
    };
    await CabinDayNote.create(payload);
    saved++;
    updated.push({ date: d, legendId });
  }

  return { success: true, data: { saved, updated } };
};