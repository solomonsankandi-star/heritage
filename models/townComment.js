// In: models/townComment.js

const mongoose = require('mongoose');

const townCommentSchema = new mongoose.Schema({
  text: { 
    type: String, 
    required: [true, 'Comment text is required.'] 
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // We use the town's name as a string identifier
  townName: { 
    type: String, 
    required: true,
    index: true // Index for faster lookups
  },
  isFactVerified: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('TownComment', townCommentSchema);