const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter: function(req, file, next){
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next (null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed'}, false);
    }
  }
};


exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store'});
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async(req, res, next) => {
  // Check if there is no new file to resize
  if (!req.file){
    next();
    return;
  }
  const extension = req.file.mimetype.split("/")[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now do the resizing
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // Keep going after file is written to file system
  next();
}

exports.createStore = async (req, res) => {
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async  (req, res) => {
  //1. Query the db for a list of all stores
  const stores = await Store.find();
  res.render('stores', { title: 'Stores', stores: stores})
};

exports.editStore = async (req, res) => {
  // First find store given its id
  const store = await Store.findOne({ _id: req.params.id });

  //confirm they are the owner of the store

  //Render out the edit form so user can update their store
  res.render('editStore', { title: `Edit ${store.name}`, store: store});
};

exports.updateStore = async (req, res) => {
  // set the location data to be a point
  req.body.location.type = 'Point';
  // find and update store
  const store = await Store.findOneAndUpdate({_id: req.params.id, }, req.body, {
    new: true, //return the new store instead of the old one
    runValidators: true // validate input data - by default, it only validates
                       // on initial creation of store
  }).exec();
  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`);
  res.redirect(`/stores/${store._id}/edit`);
  // Redirect them to store and tell them it worked
};
