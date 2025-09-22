import FirebaseModel from './firebaseModel.js';

class Counter extends FirebaseModel {
  constructor() {
    super('counters');
  }

  // Get the next sequence value for a given counter ID
  async getNextSequence(counterId) {
    // Get the current counter document
    const counterDoc = await this.findById(counterId);
    
    // If counter doesn't exist, create it with initial value 1
    if (!counterDoc) {
      await this.create({ _id: counterId, seq: 1 });
      return 1;
    }
    
    // Increment the sequence
    const newSeq = (counterDoc.seq || 0) + 1;
    
    // Update the counter in Firestore
    await this.findByIdAndUpdate(counterId, { seq: newSeq });
    
    return newSeq;
  }
}

const counterModel = new Counter();
export default counterModel;





