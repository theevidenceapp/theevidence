import {Types} from 'mongoose';

declare global {
    namespace Express {
        interface User {
            _id: Types.ObjectId
        }
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