
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
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
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['viewer', 'analyst', 'admin'],
    default: 'viewer',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    required: true,
  },
},
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);