import session from "express-session";
import config from "./config.js";

if (!config.SESSION_SECRET) {
  console.error("SESSION_SECRET is not set");
  process.exit(1);
}

export const sessionConfig = session({
  secret: config.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 100 },
});