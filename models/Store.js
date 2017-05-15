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
  photo: String
});

storeSchema.pre('save', function(next) {
  if (!this.isModified('name')){
    next(); //skip it, name has not been changed, so no
            //need to update the slug
    return; //stop function from continuing
  }
  //this = the store instance we are trying to save
  this.slug = slug(this.name);
  next();
  //TODO make sure slugs are unique so no duplicate store name slugs
});

module.exports = mongoose.model('Store', storeSchema);
