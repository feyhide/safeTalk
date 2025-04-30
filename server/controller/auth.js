import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { redisClient } from "../server.js";
import User from "../model/user.js";
import dotenv from "dotenv";
import crypto from "crypto";
import {
  validateEmail,
  validateOtp,
  validateResetPassword,
  validateSignin,
  validateSignup,
} from "../utils/validation/auth_validator.js";
import {
  sendError,
  sendSuccess,
  sendValidationError,
} from "../utils/response.js";
import { encryptPrivateKey, generateECCKeys } from "../encryption/ecc.js";

dotenv.config();

const generateOTP = () => {
  const otp = crypto.randomInt(100000, 1000000);
  return otp.toString();
};

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  pool: true,
  maxMessages: 50,
  maxConnections: 5,
  rateLimit: 20,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const signup = async (req, res) => {
  const { email, password, username } = req.body;
  const { error, value } = validateSignup(req.body);

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return sendValidationError(res, errorMessages, null, 400);
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already in use." });

    const hashedPassword = bcryptjs.hashSync(password, 8);

    const otp = generateOTP();
    const otpKey = `otp:${email}`;
    const tempUserKey = `temp_user:${email}`;

    const pipeline = redisClient.pipeline();
    pipeline.del(otpKey);
    pipeline.del(tempUserKey);
    pipeline.setex(otpKey, 60, otp);
    pipeline.setex(
      tempUserKey,
      600,
      JSON.stringify({ username, email, hashedPassword })
    );
    await pipeline.exec();

    await transporter.sendMail({
      to: email,
      subject: "OTP for Account Verification",
      text: `Your OTP is ${otp}. It expires in 1 minute.`,
    });

    return sendSuccess(
      res,
      `OTP sent to ${email}. Please verify within 1 minute.`,
      null,
      200
    );
  } catch (error) {
    console.error("Signup Error:", error);
    return sendError(res, "Signup failed. Try again later", null, 500);
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const { error, value } = validateOtp(req.body);

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return sendValidationError(res, errorMessages, null, 400);
  }

  try {
    const otpKey = `otp:${email}`;
    const tempUserKey = `temp_user:${email}`;

    const storedOtp = await redisClient.get(otpKey);
    const tempUserData = await redisClient.get(tempUserKey);

    if (!storedOtp || !tempUserData) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    if (storedOtp !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const {
      username,
      email: userEmail,
      hashedPassword: password,
    } = JSON.parse(tempUserData);

    await redisClient.del(otpKey);
    await redisClient.del(tempUserKey);

    const avatar = `https://robohash.org/${username}`;

    const { privateKey, publicKey } = generateECCKeys();
    const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET;
    const { encrypted, keyIv, keySalt } = encryptPrivateKey(
      privateKey.export({ format: "pem", type: "pkcs8" }),
      PRIVATE_KEY_SECRET
    );

    const newUser = new User({
      username,
      avatar,
      email,
      password,
      keys: [
        {
          publicKey: publicKey.export({ format: "pem", type: "spki" }),
          encryptedPrivateKey: encrypted,
          iv: keyIv,
          salt: keySalt,
        },
      ],
      activeKeyId: "",
    });

    await newUser.save();

    newUser.activeKeyId = newUser.keys[0]._id;
    await newUser.save();

    const validUser = await User.findOne({ email }).select(
      "username email _id avatar"
    );

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return sendSuccess(res, "User registered successfully!", validUser, 200);
  } catch (error) {
    console.error("OTP Verification Error:", error);
    if (error.code === 11000) {
      return sendError(res, "Username is taken.", null, 500);
    }
    return sendError(
      res,
      "An error occurred during OTP verification.",
      null,
      500
    );
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;

  const { error, value } = validateSignin(req.body);

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return sendValidationError(res, errorMessages, null, 400);
  }

  try {
    const validUser = await User.findOne({ email }).select(
      "username email _id avatar password"
    );

    if (!validUser) {
      return sendError(res, "Invalid Credentials", null, 400);
    }

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) {
      return sendError(res, "Invalid Credentials", null, 400);
    }

    const userObject = validUser.toObject();
    delete userObject.password;

    const token = jwt.sign({ id: validUser._id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return sendSuccess(res, "Logged in successfully.", userObject, 200);
  } catch (error) {
    console.log(error);
    return sendError(res, "Sign in failed. Try again later", null, 500);
  }
};

export const signout = async (req, res, next) => {
  try {
    res.clearCookie("access_token");
    return sendSuccess(res, "Logged out successfully.", null, 200);
  } catch (error) {
    console.error("Signout error:", error);
    return sendError(res, "Sign out failed. Try again later.", null, 500);
  }
};

export const renewUserKeys = async (req, res, next) => {
  try {
    const { privateKey, publicKey } = generateECCKeys();
    const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET;
    const { encrypted, keyIv, keySalt } = encryptPrivateKey(
      privateKey.export({ format: "pem", type: "pkcs8" }),
      PRIVATE_KEY_SECRET
    );

    const user = await User.findById(req.userId);

    if (!user) {
      return sendError(res, "User not found.", null, 404);
    }

    const newKey = {
      publicKey: publicKey.export({ format: "pem", type: "spki" }),
      encryptedPrivateKey: encrypted,
      iv: keyIv,
      salt: keySalt,
    };

    user.keys.push(newKey);

    user.activeKeyId = user.keys[user.keys.length - 1]._id;

    await user.save();

    return sendSuccess(res, "Keys renewed successfully.", null, 200);
  } catch (error) {
    console.error("Error renewing keys:", error);
    return sendError(
      res,
      "Renewing keys process failed. Try again later.",
      null,
      500
    );
  }
};

export const resetLink = async (req, res) => {
  const { email } = req.body;
  const { error } = validateEmail(email);

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return sendValidationError(res, errorMessages, null, 400);
  }

  try {
    const resetKey = `reset:${email}`;

    const exists = await redisClient.get(resetKey);
    if (exists) {
      return sendError(
        res,
        "Already sent reset link to your email. Wait for a few minutes before requesting again.",
        null,
        400
      );
    }

    const user = await User.findOne({ email });

    if (user) {
      const resetToken = jwt.sign(
        { id: user._id, token_version: user.tokenVersion },
        process.env.JWT_RESET,
        { expiresIn: "1h" }
      );

      const resetUrl = `${process.env.ORIGIN_PRODUCTION}/reset-password/${resetToken}`;

      await transporter.sendMail({
        to: email,
        subject: "Password Reset Request",
        text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nNote: This link will expire in 1 hour.`,
        html: `
    <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
      <h2>Password Reset</h2>
      <p>Click <a href="${resetUrl}" style="color: blue;">here</a> to reset your password.</p>
      <p>This link will expire in 1 min. If you did not request this, ignore the message.</p>
    </div>
  `,
      });

      await redisClient.setex(resetKey, 60, email);

      return sendSuccess(
        res,
        `Reset link sent to ${user.email}, expires in 1 min. Check your inbox or spam folder.`,
        null,
        200
      );
    } else {
      return sendError(res, "User not found.", null, 404);
    }
  } catch (error) {
    console.error("Error sending reset link:", error);
    return sendError(res, "Error sending reset link.", error.message, 500);
  }
};

export const resetPassword = async (req, res) => {
  const { email, url, newPassword } = req.body;
  const { error } = validateResetPassword({ email, newPassword });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return sendValidationError(res, errorMessages, null, 400);
  }

  try {
    const token = url.split("/reset-password/")[1];
    const resetKey = `reset:${email}`;
    const exists = await redisClient.get(resetKey);

    if (!exists) {
      return sendError(res, "Reset link expired or invalid.", null, 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_RESET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return sendError(
          res,
          "Link has expired. Request a new one.",
          null,
          401
        );
      } else if (err.name === "JsonWebTokenError") {
        return sendError(res, "Invalid reset link.", null, 401);
      } else {
        return sendError(res, "Token verification failed.", err.message, 401);
      }
    }

    const user = await User.findById(decoded.id);
    if (!user || user.tokenVersion !== decoded.token_version) {
      return sendError(res, "User not found or token invalid.", null, 404);
    }

    const hashedPassword = bcryptjs.hashSync(newPassword, 10);
    user.password = hashedPassword;

    const { privateKey, publicKey } = generateECCKeys();
    const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET;
    const { encrypted, keyIv, keySalt } = encryptPrivateKey(
      privateKey.export({ format: "pem", type: "pkcs8" }),
      PRIVATE_KEY_SECRET
    );

    const newKey = {
      publicKey: publicKey.export({ format: "pem", type: "spki" }),
      encryptedPrivateKey: encrypted,
      iv: keyIv,
      salt: keySalt,
    };

    user.keys.push(newKey);

    user.activeKeyId = user.keys[user.keys.length - 1]._id;

    await user.save();

    await redisClient.del(resetKey);

    const userObject = user.toObject();
    delete userObject.password;

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return sendSuccess(res, "Password reset successfully!", userObject, 200);
  } catch (error) {
    console.error("Error resetting password:", error);
    return sendError(res, "Reset failed. Try again later.", error.message, 500);
  }
};
