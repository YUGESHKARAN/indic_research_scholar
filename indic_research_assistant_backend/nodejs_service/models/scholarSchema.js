const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const docRefSchema = new mongoose.Schema(
  {
    doc_id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
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
      minlength: 8,
      select: false,
      // only required for local (email/password) accounts — GitHub accounts have none
      required: function () {
        return this.authProvider === 'local';
      },
    },
    authProvider: {
      type: String,
      enum: ['local', 'github'],
      default: 'local',
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true, // lets many docs have no githubId without violating the unique index
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },
    docs: {
      type: [docRefSchema],
      default: [],
    },
  },
  { timestamps: true }
);

scholarSchema.index({ email: 1, 'docs.doc_id': 1 });

// Only hash when there's actually a password to hash — GitHub-only accounts have none
scholarSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

scholarSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return Promise.resolve(false); // GitHub-only account, nothing to compare
  return bcrypt.compare(candidate, this.password);
};

scholarSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.otp;
    delete ret.otpExpiresAt;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Scholar', scholarSchema);