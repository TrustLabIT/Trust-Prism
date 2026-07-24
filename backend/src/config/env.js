require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  mongoUri: process.env.MONGO_URI || "",
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  aws: {
    // accept either naming convention
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "",
    bucket: process.env.S3_BUCKET || process.env.AWS_BUCKET || "",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
};
