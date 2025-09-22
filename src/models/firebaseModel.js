import admin from 'firebase-admin';

// Firebase Query Builder for MongoDB-like syntax
class FirebaseQuery {
  constructor(model, filter = {}) {
    this.model = model;
    this.filter = filter;
    this.options = {};
  }

  sort(sortObj) {
    this.options.sort = sortObj;
    return this;
  }

  skip(count) {
    this.options.skip = count;
    return this;
  }

  limit(count) {
    this.options.limit = count;
    return this;
  }

  async exec() {
    return this.model.find(this.filter, this.options);
  }
}

class FirebaseModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
    
    // Initialize query object to prevent undefined errors
    this.query = {
      sortField: null,
      sortDirection: 'asc',
      skipCount: 0,
      limitCount: 0
    };
    
    // Get the Firestore instance safely
    try {
      // Try to get the existing app
      this.db = admin.app().firestore();
    } catch (error) {
      // If no app exists, we're likely in a context where server.js hasn't run yet
      console.warn('Firebase app not initialized yet. This is expected during module loading.');
      // We'll initialize the collection later when it's actually used
    }
  }
  
  // Ensure we have a valid Firestore collection before any operation
  _ensureCollection() {
    if (!this.collection) {
      this.db = admin.app().firestore();
      this.collection = this.db.collection(this.collectionName);
    }
    return this.collection;
  }

  // Convert Firebase Timestamps to JavaScript Date objects or ISO strings
  _convertFirebaseTimestamps(data) {
    if (!data) return data;
    
    const convertValue = (value) => {
      // Check if it's a Firebase Timestamp
      if (value && typeof value === 'object' && value._seconds !== undefined && value._nanoseconds !== undefined) {
        // Convert Firebase Timestamp to JavaScript Date
        const date = new Date(value._seconds * 1000 + value._nanoseconds / 1000000);
        return date.toISOString();
      }
      
      // If it's already a Date object, convert to ISO string
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // If it's an object, recursively convert its properties
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const converted = {};
        for (const [key, val] of Object.entries(value)) {
          converted[key] = convertValue(val);
        }
        return converted;
      }
      
      // If it's an array, convert each element
      if (Array.isArray(value)) {
        return value.map(item => convertValue(item));
      }
      
      return value;
    };
    
    return convertValue(data);
  }

  async create(data) {
    const collection = this._ensureCollection();
    if (data._id) {
      const docRef = collection.doc(data._id.toString());
      await docRef.set(data);
      const result = { ...data, id: data._id };
      return this._convertFirebaseTimestamps(result);
    } else {
      const docRef = await collection.add(data);
      const result = { ...data, _id: docRef.id, id: docRef.id };
      return this._convertFirebaseTimestamps(result);
    }
  }

  async findById(id) {
    const collection = this._ensureCollection();
    const docRef = collection.doc(id.toString());
    const doc = await docRef.get();
    if (!doc.exists) return null;
    const result = { ...doc.data(), _id: doc.id, id: doc.id };
    return this._convertFirebaseTimestamps(result);
  }

  async findOne(filter) {
    const collection = this._ensureCollection();
    let query = collection;
    Object.entries(filter).forEach(([key, value]) => {
      query = query.where(key, '==', value);
    });
    const snapshot = await query.limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const result = { ...doc.data(), _id: doc.id, id: doc.id };
    return this._convertFirebaseTimestamps(result);
  }

  async find(filter = {}, projection = {}) {
    console.log(`🔍 FirebaseModel.find called with filter:`, JSON.stringify(filter, null, 2));
    
    await this._ensureCollection();
    let query = this.db.collection(this.collectionName);

    // Handle simple filters and convert MongoDB-style operators to Firestore
    const firestoreFilters = {};
    const memoryFilters = {};
    
    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'object' && value !== null) {
        // Handle MongoDB-style operators
        if (value.$nin) {
          console.log(`📝 Found $nin operator for ${key}:`, value.$nin);
          memoryFilters[key] = { $nin: value.$nin };
        } else if (value.$in) {
          console.log(`📝 Found $in operator for ${key}:`, value.$in);
          query = query.where(key, 'in', value.$in);
        } else if (value.$gt) {
          query = query.where(key, '>', value.$gt);
        } else if (value.$gte) {
          query = query.where(key, '>=', value.$gte);
        } else if (value.$lt) {
          query = query.where(key, '<', value.$lt);
        } else if (value.$lte) {
          query = query.where(key, '<=', value.$lte);
        } else {
          // For other complex objects, use equality
          firestoreFilters[key] = value;
        }
      } else {
        // Simple equality filter
        firestoreFilters[key] = value;
      }
    }

    // Apply simple equality filters to Firestore query
    for (const [key, value] of Object.entries(firestoreFilters)) {
      console.log(`🔧 Adding Firestore filter: ${key} == ${value}`);
      query = query.where(key, '==', value);
    }

    // Apply sorting if specified
    if (this.query.sortField) {
      query = query.orderBy(this.query.sortField, this.query.sortDirection || 'asc');
    }

    // Apply pagination
    if (this.query.skipCount > 0) {
      query = query.offset(this.query.skipCount);
    }
    if (this.query.limitCount > 0) {
      query = query.limit(this.query.limitCount);
    }

    console.log(`🚀 Executing Firestore query...`);
    const snapshot = await query.get();
    console.log(`📊 Firestore returned ${snapshot.docs.length} documents`);
    
    let results = snapshot.docs.map(doc => {
      const data = { _id: doc.id, id: doc.id, ...doc.data() };
      return this._convertFirebaseTimestamps(data);
    });

    // Apply memory filters (like $nin)
    if (Object.keys(memoryFilters).length > 0) {
      console.log(`🧠 Applying memory filters:`, memoryFilters);
      const originalCount = results.length;
      
      results = results.filter(doc => {
        for (const [key, filterValue] of Object.entries(memoryFilters)) {
          if (filterValue.$nin) {
            const docValue = doc[key];
            console.log(`🔍 Checking ${key}: ${docValue} not in [${filterValue.$nin.join(', ')}]`);
            if (filterValue.$nin.includes(docValue)) {
              console.log(`❌ Document filtered out: ${key} = ${docValue}`);
              return false;
            }
          }
        }
        return true;
      });
      
      console.log(`🎯 Memory filtering: ${originalCount} -> ${results.length} documents`);
    }

    console.log(`✅ Final result: ${results.length} documents`);
    return results;
  }

  // Add a chainable query builder for MongoDB-like syntax
  findQuery(filter = {}) {
    return new FirebaseQuery(this, filter);
  }

  // Add populate functionality for Firebase
  async populate(docs, populateFields) {
    if (!docs || docs.length === 0) return docs;
    
    const isArray = Array.isArray(docs);
    const docsArray = isArray ? docs : [docs];
    
    for (const populateField of populateFields) {
      const { path, select, model } = populateField;
      
      // Get unique IDs to populate
      const idsToPopulate = [...new Set(docsArray.map(doc => doc[path]).filter(id => id))];
      
      if (idsToPopulate.length === 0) continue;
      
      // Get the model instance
      let populateModel;
      if (model === 'Cabin') {
        const Cabin = (await import('./Cabin.js')).default;
        populateModel = Cabin;
      } else if (model === 'User') {
        const User = (await import('./User.js')).default;
        populateModel = User;
      } else if (model === 'Booking') {
        const Booking = (await import('./Booking.js')).default;
        populateModel = Booking;
      }
      
      if (!populateModel) continue;
      
      // Fetch related documents
      const relatedDocs = {};
      for (const id of idsToPopulate) {
        const doc = await populateModel.findById(id);
        if (doc) {
          // Apply field selection if specified
          if (select) {
            const selectedFields = {};
            const fields = select.split(' ');
            fields.forEach(field => {
              if (doc[field] !== undefined) {
                selectedFields[field] = doc[field];
              }
            });
            selectedFields._id = doc._id;
            selectedFields.id = doc.id;
            relatedDocs[id] = selectedFields;
          } else {
            relatedDocs[id] = doc;
          }
        }
      }
      
      // Replace IDs with populated documents
      docsArray.forEach(doc => {
        if (doc[path] && relatedDocs[doc[path]]) {
          doc[path] = relatedDocs[doc[path]];
        }
      });
    }
    
    return isArray ? docsArray : docsArray[0];
  }

  // Static method for populating arrays of documents
  static async populate(documents, populateOptions) {
    if (!Array.isArray(documents) || documents.length === 0) {
      return documents;
    }

    if (!Array.isArray(populateOptions)) {
      populateOptions = [populateOptions];
    }
    
    for (const option of populateOptions) {
      const { path, select, model } = option;
      
      // Extract IDs to populate
      const idsToPopulate = [...new Set(documents.map(doc => doc[path]).filter(id => id))];
      if (idsToPopulate.length === 0) continue;
      
      // Get the model instance
      let populateModel;
      if (model === 'Cabin') {
        const Cabin = (await import('./Cabin.js')).default;
        populateModel = Cabin;
      } else if (model === 'User') {
        const User = (await import('./User.js')).default;
        populateModel = User;
      } else if (model === 'Booking') {
        const Booking = (await import('./Booking.js')).default;
        populateModel = Booking;
      } else if (model === 'Unavailability') {
        const Unavailability = (await import('./Unavailability.js')).default;
        populateModel = Unavailability;
      }
      
      if (!populateModel) continue;
      
      // Fetch related documents
      const relatedDocs = {};
      for (const id of idsToPopulate) {
        const doc = await populateModel.findById(id);
        if (doc) {
          // Apply field selection if specified
          if (select) {
            const selectedFields = {};
            const fields = select.split(' ');
            fields.forEach(field => {
              if (doc[field] !== undefined) {
                selectedFields[field] = doc[field];
              }
            });
            selectedFields._id = doc._id;
            selectedFields.id = doc.id;
            relatedDocs[id] = selectedFields;
          } else {
            relatedDocs[id] = doc;
          }
        }
      }
      
      // Replace IDs with actual documents
      documents.forEach(doc => {
        if (doc[path] && relatedDocs[doc[path]]) {
          doc[path] = relatedDocs[doc[path]];
        }
      });
    }
    
    return documents;
  }

  async findByIdAndUpdate(id, update) {
    const collection = this._ensureCollection();
    const docRef = collection.doc(id.toString());
    let cleanUpdate = update.$set || update;
    await docRef.update(cleanUpdate);
    const updatedDoc = await docRef.get();
    const result = { ...updatedDoc.data(), _id: updatedDoc.id, id: updatedDoc.id };
    return this._convertFirebaseTimestamps(result);
  }

  async findByIdAndDelete(id) {
    const collection = this._ensureCollection();
    const docRef = collection.doc(id.toString());
    const doc = await docRef.get();
    if (!doc.exists) return null;
    const data = doc.data();
    await docRef.delete();
    const result = { ...data, _id: doc.id, id: doc.id };
    return this._convertFirebaseTimestamps(result);
  }

  async countDocuments(filter = {}) {
    const collection = this._ensureCollection();
    let query = collection;
    if (Object.keys(filter).length > 0) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.where(key, '==', value);
      });
    }
    const snapshot = await query.get();
    return snapshot.size;
  }

  // Bulk insert method for Firebase compatibility
  async insertMany(documents) {
    if (!Array.isArray(documents) || documents.length === 0) {
      return [];
    }

    const collection = this._ensureCollection();
    const batch = this.db.batch();
    const createdDocs = [];

    for (const doc of documents) {
      const docRef = collection.doc();
      const docData = {
        ...doc,
        _id: docRef.id,
        id: docRef.id,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      };
      
      batch.set(docRef, docData);
      createdDocs.push(docData);
    }

    await batch.commit();
    return this._convertFirebaseTimestamps(createdDocs);
  }
}

export default FirebaseModel;