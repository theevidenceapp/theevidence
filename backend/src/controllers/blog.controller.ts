import { Request, Response } from "express";
import Blog from "../models/blog.model.js";
import {
  uploadoncloudinary,
  deleteCloudnery,
} from "../services/cloudinary.service.js";

export const createBlog = async (req: Request, res: Response) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      category,
      tags,
      author,
    } = req.body;

    const files = req.files as {
      coverImage?: Express.Multer.File[];
      pdfs?: Express.Multer.File[];
    };

    // -------------------------
    // COVER IMAGE
    // -------------------------

    let coverImage = {
      url: "",
      publicId: "",
    };

    if (files.coverImage && files.coverImage.length > 0) {
      const result = await uploadoncloudinary(
        files.coverImage[0].path
      );

      if (!result) {
        return res.status(500).json({
          success: false,
          message: "Cover image upload failed",
        });
      }

      coverImage = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    // -------------------------
    // PDFS
    // -------------------------

    const pdfs = [];

    if (files.pdfs) {
      for (const file of files.pdfs) {
        const result = await uploadoncloudinary(file.path);

        if (result) {
          pdfs.push({
            url: result.secure_url,
            publicId: result.public_id,
            originalName: file.originalname,
          });
        }
      }
    }

    // -------------------------
    // CREATE BLOG
    // -------------------------

    const blog = await Blog.create({
      title,
      slug,
      content,
      excerpt,
      coverImage,
      pdfs,
      author,
      category,
      tags,
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });
  } catch (error) {
    console.error("Create blog error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create blog",
    });
  }
};

// Get all blogs
export const getBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await Blog.find()
      .populate("author", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Blogs fetched successfully",
      blogs,
    });
  } catch (error) {
    console.error("Get blogs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs",
    });
  }
};

// Get single blog
export const getBlogBySlug = async (
  req: Request,
  res: Response
) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOneAndUpdate(
      {
        slug,
        status: "PUBLISHED",
      },
      {
        $inc: { views: 1 },
      },
      {
        new: true,
      }
    ).populate("author", "name email");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      blog,
    });
  } catch (error) {
    console.error("Get blog error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog",
    });
  }
};

//update blog
export const updateBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const {
      title,
      slug,
      content,
      excerpt,
      category,
      tags,
    } = req.body;

    const files = req.files as {
      coverImage?: Express.Multer.File[];
      pdfs?: Express.Multer.File[];
    };

    // Find existing blog
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // -------------------------
    // UPDATE TEXT FIELDS
    // -------------------------

    if (title !== undefined) blog.title = title;
    if (slug !== undefined) blog.slug = slug;
    if (content !== undefined) blog.content = content;
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (category !== undefined) blog.category = category;
    if (tags !== undefined) blog.tags = tags;

    // -------------------------
    // UPDATE COVER IMAGE
    // -------------------------

    if (files?.coverImage && files.coverImage.length > 0) {
      // Delete old cover image
      if (blog.coverImage?.publicId) {
        await deleteCloudnery(blog.coverImage.publicId);
      }

      // Upload new cover image
      const result = await uploadoncloudinary(
        files.coverImage[0].path
      );

      if (!result) {
        return res.status(500).json({
          success: false,
          message: "Cover image upload failed",
        });
      }

      blog.coverImage = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    // -------------------------
    // UPDATE PDFs
    // -------------------------

    if (files?.pdfs && files.pdfs.length > 0) {
      // Delete old PDFs
      for (const pdf of blog.pdfs) {
        if (pdf.publicId) {
          await deleteCloudnery(pdf.publicId);
        }
      }

      // Remove old PDFs
      blog.pdfs = [];

      // Upload new PDFs
      for (const file of files.pdfs) {
        const result = await uploadoncloudinary(file.path);

        if (result) {
          blog.pdfs.push({
            url: result.secure_url,
            publicId: result.public_id,
            originalName: file.originalname,
          });
        }
      }
    }

    await blog.save();

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog,
    });
  } catch (error) {
    console.error("Update blog error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update blog",
    });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find blog
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Delete cover image from Cloudinary
    if (blog.coverImage?.publicId) {
      await deleteCloudnery(blog.coverImage.publicId);
    }

    // Delete all PDFs from Cloudinary
    if (blog.pdfs && blog.pdfs.length > 0) {
      for (const pdf of blog.pdfs) {
        if (pdf.publicId) {
          await deleteCloudnery(pdf.publicId);
        }
      }
    }

    // Delete blog from MongoDB
    await Blog.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Delete blog error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete blog",
    });
  }
};

export const updateBlogStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = [
      "DRAFT",
      "PENDING",
      "APPROVED",
      "PUBLISHED",
      "REJECTED",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog status",
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    blog.status = status;

    // Set publishedAt when blog becomes published
    if (status === "PUBLISHED") {
      blog.publishedAt = new Date();
    }

    // Remove published date if it is moved away from published
    if (status !== "PUBLISHED") {
      blog.publishedAt = null;
    }

    await blog.save();

    return res.status(200).json({
      success: true,
      message: "Blog status updated successfully",
      blog,
    });
  } catch (error) {
    console.error("Update blog status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update blog status",
    });
  }
};

export const getPublishedBlogs = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      search,
      category,
      tag,
      page = "1",
      limit = "10",
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const perPage = Math.min(Math.max(Number(limit), 1), 50);

    const filter: any = {
      status: "PUBLISHED",
    };

    // Search
    if (search) {
      filter.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          excerpt: {
            $regex: search,
            $options: "i",
          },
        },
        {
          content: {
            $regex: search,
            $options: "i",
          },
        },
        {
          tags: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // Category filter
    if (category) {
      filter.category = {
        $regex: category,
        $options: "i",
      };
    }

    // Tag filter
    if (tag) {
      filter.tags = {
        $regex: tag,
        $options: "i",
      };
    }

    const skip = (currentPage - 1) * perPage;

    const [blogs, totalBlogs] = await Promise.all([
      Blog.find(filter)
        .populate("author", "name email")
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(perPage),

      Blog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Published blogs fetched successfully",

      pagination: {
        page: currentPage,
        limit: perPage,
        totalBlogs,
        totalPages: Math.ceil(totalBlogs / perPage),
      },

      blogs,
    });
  } catch (error) {
    console.error("Get published blogs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch published blogs",
    });
  }
};