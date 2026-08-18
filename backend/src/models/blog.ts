import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    excerpt: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "APPROVED", "PUBLISHED", "REJECTED"],
      default: "DRAFT",
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Blog = mongoose.model("Blog", blogSchema);

export default Blog;