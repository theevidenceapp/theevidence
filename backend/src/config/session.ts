import session from "express-session";
import config from "./config.js";
import MongoStore from "connect-mongo";

if (!config.SESSION_SECRET) {
  console.error("SESSION_SECRET is not set");
  process.exit(1);
}

export const sessionConfig = session({
  secret: config.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.MONGO_URI,
    ttl: 14 * 24 * 60 * 60,
  }),
  cookie: {
    secure: config.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 100,
  },
});
