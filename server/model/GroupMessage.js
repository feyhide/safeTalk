import mongoose from 'mongoose';

const GroupMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group', 
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: true
    },
    senderKeyId: {
      type: String,
      required: true
    },
    message: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User', 
          required: true
        },
        encryptedMessage: {
          type: String,
          required: true
        },
        iv: {
          type: String,
          required: true
        },
        memberActiveKeyId: {
          type: String,
          required: true
        }
      }
    ]
  },
  { timestamps: true }
);

const GroupMessage = mongoose.model('GroupMessage', GroupMessageSchema);

export default GroupMessage;
