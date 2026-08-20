import { Router } from "express";
import { getEditor, getPublisher } from "../controllers/auth.controller.js";
import { BlockUser, getBlockedUsers, makeEditor, removeEditor, unblockUser,getAnalytics,getBlogAnalytics } from "../controllers/admin.controller.js";

export const adminRouter = Router();

adminRouter.get("/geteditor",getEditor);
adminRouter.get("/getpublisher",getPublisher);
adminRouter.put("/block/:email",BlockUser);
adminRouter.put("/createeditor/:email",makeEditor);
adminRouter.put("/removeeditor/:email",removeEditor);
adminRouter.get("/getblockuser",getBlockedUsers);
adminRouter.put("/unblock/:email",unblockUser);
adminRouter.get("/analytics", getAnalytics);
adminRouter.get("/analytics/blogs", getBlogAnalytics);