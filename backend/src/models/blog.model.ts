import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    // Blog title
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // URL-friendly title
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Rich text content
    // Example:
    // <p>Hello <strong>World</strong></p>
    content: {
      type: String,
      required: true,
    },

    // Short description
    excerpt: {
      type: String,
      default: "",
      trim: true,
    },

    // Blog cover image
    coverImage: {
      url: {
        type: String,
        default: "",
      },

      publicId: {
        type: String,
        default: "",
      },
    },

    // Maximum 3 PDFs
    pdfs: [
      {
        url: {
          type: String,
          required: true,
        },

        publicId: {
          type: String,
          required: true,
        },

        originalName: {
          type: String,
          required: true,
        },
      },
    ],

    // User who created the blog
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Blog category
    category: {
      type: String,
      default: "",
      trim: true,
    },

    // Blog tags
    tags: {
      type: [String],
      default: [],
    },

    // Publishing workflow
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING",
        "APPROVED",
        "PUBLISHED",
        "REJECTED",
      ],
      default: "DRAFT",
    },

    // Published date
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