import mongoose, { Model, Schema } from "mongoose";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  googleId: string;
  isVerified?: boolean;
  name: string;
  avatar: string;
  accessToken: string;
  phone_number?: string;
  dob?: Date;
  role: "READER" | "PUBLISHER" | "ADMIN" | "EDITOR";
  isActive: boolean;

  generateAuthToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },

    googleId: {
      type: String,
      required: false,
    },

    isVerified: {
      type: Boolean,
    },

    name: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    accessToken: {
      type: String,
      default: "",
    },

    phone_number: {
      type: String,
    },

    dob: Date,

    role: {
      type: String,
      enum: ["READER", "PUBLISHER", "ADMIN", "EDITOR"],
      default: "READER",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.generateAuthToken = function (): string {
  return jwt.sign(
    {
      userId: this._id.toString(),
      fullname: this.name,
      email: this.email,
      role: this.role,
    },
    config.JWT_SECRET,
    {
      expiresIn: "15m",
    },
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    {
      userId: this._id.toString(),
    },
    config.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
