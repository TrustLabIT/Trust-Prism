const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["Super Admin", "Brand Manager", "Reviewer", "Content Editor", "Agency Contributor", "Viewer"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // never returned by default
    role: { type: String, enum: ROLES, default: "Content Editor" },
    type: { type: String, enum: ["Internal", "External"], default: "Internal" },
    org: { type: String, default: "Internal" },       // "Internal" or an agency name
    scope: { type: String, enum: ["own", "all"], default: "own" },
    status: { type: String, enum: ["Active", "Invited"], default: "Active" },
  },
  { timestamps: true }
);

// Hash the password whenever it is set/changed (Mongoose 9 async middleware — no next())
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Strip sensitive/internal fields from JSON output
userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model("User", userSchema);
