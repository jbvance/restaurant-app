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
});

// Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

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

module.exports = mongoose.model('Store', storeSchema);
