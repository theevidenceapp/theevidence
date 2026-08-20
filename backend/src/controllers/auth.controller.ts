import { Request, Response } from "express";
import User from "../models/user.model.js";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, name, avatar } = req.body;   
    const user = await User.create({
      email,
      name,
      avatar,
      role: "PUBLISHER",
    });


    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
};

export const getEditor = async(req:Request , res:Response) => {
  try {
      const editor = await User.find({role : "EDITOR"});
      if(!editor){
         return res.status(404).json({ msg : "no editor found"});
      };
      return res.status(200).json({msg : "editors found" , editor})
  } catch (error) {
    return res.status(500).json({msg : `Internal server error`})
  }
}

export const getPublisher = async(req:Request , res:Response) => {
     try {
        const editor = await User.find({role : "PUBLISHER"});
      if(!editor){
         return res.status(404).json({ msg : "no editor found"});
      };
      return res.status(200).json({msg : "editors found" , editor})
     } catch (error) {
        return res.status(500).json({msg : `Internal server error`})
     }
}