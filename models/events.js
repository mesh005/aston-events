let mongoose = require ('mongoose');

//Events Schema
let eventSchema = mongoose.Schema({
  event_category:{
    type: String,
    required: true
  },
  event_name:{
    type: String,
    required: true
  },
  date:{
    type: Date,
    required: true
  },
  description:{
    type: String,
    required: true
  },
  location:{
    type: String,
    required: true
  },
  organiser:{
    type: String,
    required: true
  },
});
let Event = module.exports = mongoose.model('Event', eventSchema);
