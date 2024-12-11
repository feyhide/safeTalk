import mongoose from "mongoose";
import User from "../model/user.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { validateSearchingContacts } from "../utils/validation/contacts_validation.js";

export const searchUsers = async (req, res) => {
    const { username } = req.body;
    const { error, value } = validateSearchingContacts(req.body);

    if (error) {
        const errorMessages = error.details.map(detail => detail.message);
        return sendValidationError(res, errorMessages, null, 400);
    }

    try {
        const regex = new RegExp(username, "i");

        const currentUser = await User.findById(req.userId).select('connectedPeoples');
        console.log(req.userId,username)
        const users = await User.find({
            $and: [
                    { _id: { $ne: req.userId } },
                    { username: regex },
                    { _id: { $nin: currentUser.connectedPeoples.userId } }
                ]
            })
            .select('_id username avatar keys activeKeyId')
            .lean() 
            .then(users => {
                return users.map(user => {
                    if (user.keys && Array.isArray(user.keys)) {
                        user.keys = user.keys.filter(key => key.publicKey)
                            .map(key => ({ publicKey: key.publicKey, _id: key._id }));
                    }
                    return user;
                });
            });
        
            console.log(users)
        if (users.length > 0) {
            return sendSuccess(res, "Users found", users, 200);
        } else {
            return sendSuccess(res, "Users not found", [], 404);
        }
    } catch (error) {
        console.log(error);
        return sendError(res, 'Searching Users failed. Try again later', null, 500);
    }
};


export const getKeys = async (userId) => {
    try {
        const user = await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(userId) } },
            { 
                $project: {
                    keys: 1, 
                    activeKeyId: 1 
                }
            }
        ])

        if (user.length > 0) {
            if (user[0].keys.length > 0) {
                const activeKeyId = user[0].activeKeyId;

                const activeKey = user[0].keys.find(key => key._id.toString() === activeKeyId.toString());
                if (activeKey) {
                    return {activeKey};  
                } else {
                    console.log("No matching key found for activeKeyId.");
                    return null;
                }
            } else {
                console.log("No keys found for user.");
                return null;
            }
        } else {
            console.log("User not found.");
            return null;
        }
    } catch (error) {
        console.log("Error getting user keys:", error);
        return null;
    }
};

