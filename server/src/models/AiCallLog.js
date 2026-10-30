import mongoose from 'mongoose';

const aiCallLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    task: {
      type: String,
      required: true,
      enum: ['categorize', 'budget_optimize', 'insights']
    },
    provider: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    ok: {
      type: Boolean,
      required: true
    },
    latencyMs: {
      type: Number,
      required: true
    },
    attempt: {
      type: Number,
      default: 1
    },
    inputChars: {
      type: Number,
      default: 0
    },
    outputChars: {
      type: Number,
      default: 0
    },
    errorType: {
      type: String,
      enum: [
        'timeout',
        'rate_limit',
        'http',
        'invalid_json',
        'schema',
        'no_key',
        'other'
      ],
      default: null
    },
    fallbackUsed: {
      type: Boolean,
      default: false
    },
    promptVersion: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 30 * 24 * 60 * 60 // 30 days TTL
    }
  },
  {
    timestamps: false
  }
);

aiCallLogSchema.index({ userId: 1, createdAt: -1 });

export const AiCallLog = mongoose.model('AiCallLog', aiCallLogSchema);
export default AiCallLog;

