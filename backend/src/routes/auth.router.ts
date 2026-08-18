import { Router } from "express";
import { createUser, getUser } from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.route("/signup").post(createUser);
authRouter.route("/getuser/:id").get(getUser);

export default authRouter;