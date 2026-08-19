import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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

const User = mongoose.model("User", userSchema);

export default User;
