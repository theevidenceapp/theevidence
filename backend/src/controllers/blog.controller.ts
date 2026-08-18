import { Request, Response } from "express";
import Blog from "../models/blog.js";
import cloudinary from "../config/cloudinary.js";

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

        let coverImage = "";

        if (req.file) {
            const file = req.file;

            const result = await new Promise<any>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: "theevidence/blogs",
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                uploadStream.end(file.buffer);
            });

            coverImage = result.secure_url;
        }

        const blog = await Blog.create({
            title,
            slug,
            content,
            excerpt,
            coverImage,
            author,
            category,
            tags,
        });

        res.status(201).json({
            success: true,
            message: "Blog created successfully",
            blog,
        });
    } catch (error) {
        console.error("Create blog error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create blog",
        });
    }
};