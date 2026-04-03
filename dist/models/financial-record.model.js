import mongoose from 'mongoose';
const financialRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function (value) {
                return Number.isFinite(value) && value > 0;
            },
            message: 'Amount must be a positive number',
        },
    },
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true,
        index: true,
    },
    category: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});
// Compound index for efficient queries
financialRecordSchema.index({ userId: 1, date: -1 });
financialRecordSchema.index({ userId: 1, type: 1, isDeleted: 1 });
financialRecordSchema.index({ userId: 1, category: 1, isDeleted: 1 });
export const FinancialRecord = mongoose.model('FinancialRecord', financialRecordSchema);
