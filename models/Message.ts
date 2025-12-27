import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  sender: string;
  text: string;
  timestamp: Date;
  createdAt: Date;
  fileUrl?: string;
  fileType?: "image" | "video";
  fileName?: string;
  readBy?: string[];
}

const MessageSchema: Schema = new Schema(
  {
    sender: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      default: "",
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileType: {
      type: String,
      enum: ["image", "video"],
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    readBy: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ timestamp: -1 });

const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
