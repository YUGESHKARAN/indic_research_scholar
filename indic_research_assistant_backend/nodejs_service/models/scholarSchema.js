const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const docRefSchema = new mongoose.Schema(
  {
    doc_id: {
      type: String,
      required: true,      // matches the doc_id / Pinecone filter value from Flask
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }             // no separate ObjectId per doc ref — doc_id is the identifier
);

const scholarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,        // never returned by default on .find()/.findOne()
    },
    docs: {
      type: [docRefSchema],
      default: [],
    },

    otp: { type: String },
    otpExpiresAt: { type: Date   },
  },
  { timestamps: true }
);

// index for fast lookups when Flask pushes a doc by email + doc_id
scholarSchema.index({ email: 1, 'docs.doc_id': 1 });

// Hash password only when it's new or changed
scholarSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

scholarSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Strip password even if it was accidentally selected, and clean up output
scholarSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const Scholar =  mongoose.model('Scholar', scholarSchema);

module.exports = Scholar