import {Types} from 'mongoose';
import { IUser } from '../models/user.model.ts';

declare global {
    namespace Express {
        interface User extends IUser {}
    }
}

declare module 'express-session' {
    interface SessionData {
        messages?: Array<{
            code?:string;
            message?:string;
        }>;
    }
}