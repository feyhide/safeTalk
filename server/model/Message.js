
import mongoose from 'mongoose';

  const MessageSchema = new mongoose.Schema(
    {
        chatId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chat', 
            required: true
        },
        message: {
            type: String,
            required: true
        },
        iv: {
            type: String,
            required: true
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', 
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
        recipientKeyId: {
            type: String,
            required: true
        },
    },
    { timestamps: true }
  );
  
  const Message = mongoose.model('Message', MessageSchema);
  
  export default Message;
  