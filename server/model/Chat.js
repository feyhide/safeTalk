
import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema(
    {
      members: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User', 
        },
      ]
    },
    { timestamps: true }
  );
  
  
const Chat = mongoose.model('Chat', ChatSchema);

export default Chat;
