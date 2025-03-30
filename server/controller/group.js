import Group from "../model/Group.js";
import User from "../model/user.js";
import {
  sendError,
  sendSuccess,
  sendValidationError,
} from "../utils/response.js";
import {
  validateAddInGroup,
  validateGroupName,
} from "../utils/validation/auth_validator.js";

export const createGroup = async (req, res) => {
  const { groupName } = req.body;

  const { error } = validateGroupName(req.body);
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return sendValidationError(res, errorMessages, null, 400);
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return sendError(
        res,
        "User trying to create a group does not exist.",
        null,
        404
      );
    }

    const newGroup = new Group({
      groupName,
      members: [
        {
          user: req.userId,
          role: "admin",
        },
      ],
    });

    await newGroup.save();

    user.connectedGroups.push(newGroup._id);
    await user.save();

    const group = await Group.findById(newGroup._id).populate({
      path: "members.user",
      select: "_id username avatar",
    });

    return sendSuccess(res, "Group created successfully.", group, 200);
  } catch (error) {
    console.error(error);
    return sendError(res, "Creating group failed. Try again later.", null, 500);
  }
};

export const getGroupList = async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const groups = await Group.find({ "members.user": req.userId })
      .populate({
        path: "members.user",
        select: "_id username avatar",
      })
      .sort({ updatedAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    const totalGroups = await Group.countDocuments({
      "members.user": req.userId,
    });
    const totalPages = Math.ceil(totalGroups / parsedLimit);

    return res.status(200).json({
      success: true,
      data: groups,
      totalGroups,
      totalPages,
      currentPage: parsedPage,
    });
  } catch (error) {
    console.error("Error fetching group list:", error);
    return sendError(res, "Error fetching group list", null, 500);
  }
};

export const getGroupInfo = async (req, res) => {
  try {
    const { groupId } = req.query;

    const group = await Group.findById(groupId)
      .populate("members.user", "_id username avatar")
      .lean();

    console.log(group);
    return sendSuccess(res, "fetched group info successfully", group, 200);
  } catch (error) {
    console.log(error);
    return sendError(res, "error fetching group info", null, 500);
  }
};
