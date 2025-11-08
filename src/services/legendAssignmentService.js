import Cabin from '../models/Cabin.js';
import Legend from '../models/Legend.js';
import Unavailability from '../models/Unavailability.js';
import { upsertLegendAssignments } from './notesService.js';

// Build date ranges similar to blockDates for flexibility
const createDateRanges = (payload) => {
  const ranges = [];
  if (Array.isArray(payload.dates) && payload.dates.length > 0) {
    for (const d of payload.dates) {
      const dateValue = typeof d === 'object' && d.date ? d.date : d;
      const halfValue = typeof d === 'object' && d.half ? d.half : 'FULL';
      const day = new Date(dateValue);
      let dayStart, dayEnd;
      if (halfValue === 'AM') {
        dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
        dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 11, 59, 59, 999));
      } else if (halfValue === 'PM') {
        dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12, 0, 0, 0));
        dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));
      } else {
        dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
        dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));
      }
      ranges.push({ start: dayStart, end: dayEnd });
    }
  } else if (payload.date) {
    const day = new Date(payload.date);
    let dayStart, dayEnd;
    const halfValue = payload.half || 'FULL';
    if (halfValue === 'AM') {
      dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
      dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 11, 59, 59, 999));
    } else if (halfValue === 'PM') {
      dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12, 0, 0, 0));
      dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));
    } else {
      dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
      dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));
    }
    ranges.push({ start: dayStart, end: dayEnd });
  } else if (payload.startDate && payload.endDate) {
    const s = new Date(payload.startDate);
    const e = new Date(payload.endDate);
    const startHalf = payload.startHalf || 'AM';
    const endHalf = payload.endHalf || 'PM';
    const start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), startHalf === 'AM' ? 0 : 12, 0, 0, 0));
    const end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), endHalf === 'AM' ? 12 : 23, endHalf === 'AM' ? 0 : 59, endHalf === 'AM' ? 0 : 59, endHalf === 'AM' ? 0 : 999));
    ranges.push({ start, end });
  }
  return ranges;
};

const getDatesInRange = (startDate, endDate) => {
  const out = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    out.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return out.map(d => d.toISOString().slice(0,10));
};

export const applyLegendToDates = async (slug, payload, ownerUser) => {
  const cabin = await Cabin.findOne({ slug });
  if (!cabin) throw new Error('Cabin not found');
  if (!ownerUser || String(cabin.owner) !== String(ownerUser.userId)) {
    const err = new Error('Unauthorized: You can only set legends for your own cabins');
    err.status = 403;
    throw err;
  }

  const { legendId } = payload;
  if (!legendId) throw new Error('legendId is required');

  const legend = await Legend.findById(legendId);
  if (!legend) throw new Error('Legend not found');
  if (!legend.isActive) throw new Error('Legend is inactive');
  // Allow default legends or company-specific legends for this cabin
  if (!legend.isDefault && legend.companySlug && legend.companySlug !== cabin.companySlug) {
    throw new Error('Legend does not belong to this cabin company');
  }

  const ranges = createDateRanges(payload);
  if (ranges.length === 0) {
    throw new Error('No dates provided');
  }

  // Always upsert legend assignments for coloring
  const allDates = ranges.flatMap(r => getDatesInRange(r.start, r.end));
  await upsertLegendAssignments(cabin._id, allDates, legendId, ownerUser);

  // If legend is not bookable, create unavailability blocks
  let blocksCreated = 0;
  if (legend.isBookable === false) {
    const blocks = ranges.map(r => ({ cabin: cabin._id, startDate: r.start, endDate: r.end, reason: legend.name }));
    const created = await Unavailability.insertMany(blocks);
    blocksCreated = created.length;
  }

  return {
    success: true,
    message: `Legend applied to ${allDates.length} date(s)` + (legend.isBookable === false ? ` and ${blocksCreated} block(s) created` : ''),
    data: {
      legend: { id: legendId, name: legend.name, isBookable: legend.isBookable },
      dates: allDates,
      blocksCreated
    }
  };
};