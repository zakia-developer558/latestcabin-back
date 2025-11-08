import FirebaseModel from './firebaseModel.js';

class CabinDayNote extends FirebaseModel {
  constructor() {
    super('cabin_day_notes');
    this.query = {
      sortField: null,
      sortDirection: 'asc',
      skipCount: 0,
      limitCount: 0
    };
  }
}

const cabinDayNoteModel = new CabinDayNote();
export default cabinDayNoteModel;