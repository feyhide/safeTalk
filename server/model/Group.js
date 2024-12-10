
import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema(
    { 
      groupName:{
        type: String,
        required: true
      }, 
      members: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User', 
        },
      ]
    },
    { timestamps: true }
  );
  
  
const Group = mongoose.model('Group', GroupSchema);

export default Group;
