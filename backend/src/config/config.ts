import dotenv from "dotenv";

dotenv.config();

if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET is not defined in the environment variables.",
  );
}

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error(
    "GOOGLE_CLIENT_ID is not defined in the environment variables.",
  );
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "GOOGLE_CLIENT_SECRET is not defined in the environment variables.",
  );
}

if (!process.env.GOOGLE_CALLBACK_URL) {
  throw new Error(
    "GOOGLE_CALLBACK_URL is not defined in the environment variables.",
  );
}

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined in the environment variables.");
}

if (!process.env.PORT) {
  throw new Error("PORT is not defined in the environment variables.");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables.");
}

if (!process.env.CLIENT_URL) {
  throw new Error("CLIENT_URL is not defined in the environment variables.");
}

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  throw new Error(
    "CLOUDINARY_CLOUD_NAME is not defined in the environment variables.",
  );
}

if (!process.env.CLOUDINARY_API_KEY) {
  throw new Error(
    "CLOUDINARY_API_KEY is not defined in the environment variables.",
  );
}

if (!process.env.CLOUDINARY_API_SECRET) {
  throw new Error(
    "CLOUDINARY_API_SECRET is not defined in the environment variables.",
  );
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error(
    "JWT_REFRESH_SECRET is not defined in the environment variables.",
  );
}

const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI as string,
  SESSION_SECRET: process.env.SESSION_SECRET as string,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  CLIENT_URL: process.env.CLIENT_URL as string,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME as string,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY as string,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET as string,
};

export default config;
