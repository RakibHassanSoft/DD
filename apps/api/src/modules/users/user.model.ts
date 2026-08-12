import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false }
  },
  { timestamps: true, versionKey: false }
);

export type User = InferSchemaType<typeof userSchema> & { _id: Schema.Types.ObjectId };
export const UserModel = model('User', userSchema);
