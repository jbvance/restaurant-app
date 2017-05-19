const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
}, {
  // by default, MongoDB won't show virtuals when return an object or json
  // form a query, so force it to by adding the below code
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function (next) {
  if (!this.isModified('name')){
    next(); // skip it, name has not been changed, so no
            // need to update the slug
    return; // stop function from continuing
  }
  //this = the store instance we are trying to save
  this.slug = slug(this.name);
  // find other stores that have a slug of pappas, pappas-1, pappas-2, etc.
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if(storesWithSlug.length){
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }

  next();
  // TODO make sure slugs are unique so no duplicate store name slugs
});

// Have to use proper function (not arrow function) when using statics
// so that "this" will be bound to the model
storeSchema.statics.getTagsList = function () {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

storeSchema.statics.getTopStores = function () {
  return this.aggregate([
    //Lookup stores and populate their reviews
    // can't use virtual reviews from below b/c aggregate is
    // a more low-level MongoDB thing and virtual methods are a mongoose thing
    { $lookup: { from: 'reviews', localField: '_id',foreignField: 'store',
      as: 'reviews' } },

    // Filter for only stores that have two or more reviews
    // the .1 below is saying where the reviews have a [1] index like from an array,
    // meaning that they have at least two values
    { $match: { 'reviews.1': { $exists: true } } },
    // Add the average rating fields
    // If you have MongoDB 3.4, you can replace $project with $addField and you
    // won't have to add back in all the fields below. However, 3.2 will only
    // return the _id and review average when using $project like below, so
    // you have to add the other fields you need back in
    //$$ROOT is equal to the original document before $project is called
    { $project: {
      photo: '$$ROOT.photo',
      name: '$$ROOT.name',
      reviews: '$$ROOT.reviews',
      slug: '$$ROOT.slug',
      averageRating: { $avg: '$reviews.rating' }
    } },
    // sort it by our new field, highest reviews First
    { $sort: { averageRating: -1 } },

    // limit to 10 stores
    { $limit: 10}

  ]);
};

// Create a virtual method to retrieve all the reviews for a store
// find reviews where the stores _id property === reviews store property
storeSchema.virtual('reviews', {
  ref: 'Review', // which model to link to
  localField: '_id', // which field on the store
  foreignField: 'store' // which field on the review
});

//populate the reviews when a store is loaded
function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
