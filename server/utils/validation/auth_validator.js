import Joi from "joi";

const validator = (schema) => (payload) =>
  schema.validate(payload, { abortEarly: false });

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d@#$%^&*!]{6,20}$/;
const usernameRegex = /^[a-z][a-z0-9_]{2,14}$/;

const signUpSchema = Joi.object({
  email: Joi.string().pattern(emailRegex).required().messages({
    "string.pattern.base": "Invalid email format.",
    "string.empty": "Email is required.",
  }),

  password: Joi.string().pattern(passwordRegex).required().messages({
    "string.pattern.base":
      "Password must be 6-20 characters long, include at least one number, one lowercase letter, one uppercase letter, and one special character (@#$%^&*!).",
    "string.empty": "Password is required.",
  }),

  username: Joi.string().pattern(usernameRegex).required().messages({
    "string.pattern.base":
      "Username must start with a letter and contain only lowercase letters, numbers, or underscores (no spaces or special characters).",
    "string.empty": "Username is required.",
  }),
});

const signInSchema = Joi.object({
  email: Joi.string().pattern(emailRegex).required().messages({
    "string.pattern.base": "Invalid email format.",
    "string.empty": "Email is required.",
  }),

  password: Joi.string().pattern(passwordRegex).required().messages({
    "string.pattern.base": "Invalid password format.",
    "string.empty": "Password is required.",
  }),
});

const otpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.number().required(),
});

const messageValidationSchema = Joi.object({
  chatId: Joi.string().required(),
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.base": "Limit must be a number",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must not exceed 100",
  }),
});

const groupNameSchema = Joi.object({
  groupName: Joi.string()
    .required()
    .min(3)
    .pattern(/^[a-zA-Z0-9_]*$/)
    .messages({
      "string.pattern.base":
        "groupName must start with a letter and contain letters, numbers, or underscores.",
      "string.min": "groupName must be at least 3 characters long.",
      "string.empty": "groupName is required.",
    }),
});

const insertIntoGroupSchema = Joi.object({
  groupId: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9_]*$/),
  userId: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9_]*$/),
});

const validateAddInGroup = validator(insertIntoGroupSchema);
const validateSignin = validator(signInSchema);
const validateSignup = validator(signUpSchema);
const validateOtp = validator(otpSchema);
const validateMongodbId = validator(messageValidationSchema);
const validateGroupName = validator(groupNameSchema);

export {
  validateSignup,
  validateOtp,
  validateSignin,
  validateMongodbId,
  validateAddInGroup,
  validateGroupName,
};
