import { Router } from "express";
import { getEditor, getPublisher } from "../controllers/auth.controller.js";
import { BlockUser, getBlockedUsers, makeEditor, removeEditor, unblockUser,getAnalytics,getBlogAnalytics, getAllUsers } from "../controllers/admin.controller.js";

export const adminRouter = Router();

adminRouter.get("/get-editor",getEditor);
adminRouter.get("/get-publisher",getPublisher);
adminRouter.put("/block/:email",BlockUser);
adminRouter.put("/create-editor/:email",makeEditor);
adminRouter.put("/remove-editor/:email",removeEditor);
adminRouter.get("/get-blocked-users",getBlockedUsers);
adminRouter.put("/unblock/:email",unblockUser);
adminRouter.get("/analytics", getAnalytics);
adminRouter.get("/analytics/blogs", getBlogAnalytics);
adminRouter.get('/get-all-users', getAllUsers);