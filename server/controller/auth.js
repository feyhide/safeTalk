import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { redisClient } from '../server.js';
import User from '../model/user.js';
import dotenv from 'dotenv'
import crypto from 'crypto';
import { validateOtp, validateSignin, validateSignup } from '../utils/validation/auth_validator.js';
import { sendError, sendSuccess, sendValidationError } from '../utils/response.js';
import { encryptPrivateKey, generateECCKeys } from '../encryption/ecc.js';

dotenv.config();

const generateOTP = () => {
    const otp = crypto.randomInt(100000, 1000000); 
    return otp.toString();
};

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    pool:true,
    maxMessages:50,
    maxConnections:5,
    rateLimit:20,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

export const signup = async (req, res) => {
    const { email, password, username } = req.body;
    const {error,value} = validateSignup(req.body);
    
    if(error){
        const errorMessages = error.details.map(detail => detail.message);
        return sendValidationError(res,errorMessages,null,400);
    }
    
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email already in use.' });

        const hashedPassword = bcryptjs.hashSync(password, 8);

        const otp = generateOTP();
        const otpKey = `otp:${email}`;
        const tempUserKey = `temp_user:${email}`;

        const pipeline = redisClient.pipeline();
        pipeline.del(otpKey);
        pipeline.del(tempUserKey);
        pipeline.setex(otpKey, 60, otp);
        pipeline.setex(tempUserKey, 600, JSON.stringify({username, email, hashedPassword }));
        await pipeline.exec(); 

        await transporter.sendMail({
            to: email,
            subject: 'OTP for Account Verification',
            text: `Your OTP is ${otp}. It expires in 1 minute.`,
        });

        return sendSuccess(res,`OTP sent to ${email}. Please verify within 1 minute.`,null,200);
    } catch (error) {
        console.error('Signup Error:', error);
        return sendError(res,'Signup failed. Try again later',null,500)
    }
};

export const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    const { error, value } = validateOtp(req.body);

    if (error) {
        const errorMessages = error.details.map(detail => detail.message);
        return sendValidationError(res, errorMessages, null, 400);
    }

    try {
        const otpKey = `otp:${email}`;
        const tempUserKey = `temp_user:${email}`;

        const storedOtp = await redisClient.get(otpKey);
        const tempUserData = await redisClient.get(tempUserKey);

        if (!storedOtp || !tempUserData) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        if (storedOtp !== otp.toString()) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        const { username, email: userEmail, hashedPassword: password} = JSON.parse(tempUserData);
        const avatar = `https://robohash.org/${username}`;
        
        const { privateKey, publicKey } = generateECCKeys();
        const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET
        const { encrypted, keyIv, keySalt } = encryptPrivateKey(privateKey.export({ format: 'pem', type: 'pkcs8' }), PRIVATE_KEY_SECRET);

        const newUser = new User({
            username,
            avatar,
            email,
            password, 
            keys: [{
                publicKey: publicKey.export({ format: 'pem', type: 'spki' }),
                encryptedPrivateKey: encrypted,
                iv:keyIv,
                salt:keySalt
            }],
            activeKeyId: '',
        });

        await newUser.save();
        
        newUser.activeKeyId = newUser.keys[0]._id;
        await newUser.save();

        await redisClient.del(otpKey);
        await redisClient.del(tempUserKey);

        const validUser = await User.findOne({ email })
            .select('username email _id avatar password keys activeKeyId connectedGroups connectedPeoples')  
            .populate({
                path: 'connectedPeoples.userId',  
                select: '_id username avatar keys activeKeyId', 
            })
            .populate({
                path: 'connectedGroups',  
                select: '_id groupName'  
            });

        validUser.connectedPeoples = validUser.connectedPeoples.map(person => {
            person.userId.keys = person.userId.keys.map(key => ({
                publicKey: key.publicKey,
                _id: key._id
            }));
            return person;
        });

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);

        res.cookie('access_token', token, {
            httpOnly: true,
            secure: true, 
            sameSite: 'None',
        });

        return sendSuccess(res, 'User registered successfully!', validUser, 200);
    } catch (error) {
        console.error('OTP Verification Error:', error);
        if (error.code === 11000) {
            return sendError(res, 'Username is taken.', null, 500);
        }
        return sendError(res, 'An error occurred during OTP verification.', null, 500);
    }
};


export const signin = async (req, res, next) => {
    const { email, password } = req.body;
    
    const { error, value } = validateSignin(req.body);

    if (error) {
        const errorMessages = error.details.map(detail => detail.message);
        return sendValidationError(res, errorMessages, null, 400);
    }

    try {
        const validUser = await User.findOne({ email })
            .select('username email _id avatar password keys activeKeyId connectedPeoples connectedGroups')  
            .populate({
                path: 'connectedPeoples.userId',  
                select: '_id username avatar keys activeKeyId' 
            })
            .populate({
                path: 'connectedGroups',  
                select: '_id groupName',  
                populate: {
                    path: 'members',  
                    select: '_id username avatar' 
                }
            });

        if (!validUser) {
            return res.status(404).json({ message: 'Invalid credentials' });
        }

        const validPassword = bcryptjs.compareSync(password, validUser.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const userObject = validUser.toObject();
        delete userObject.password;
        
        userObject.connectedPeoples = userObject.connectedPeoples.map(person => {
            person.userId.keys = person.userId.keys.map(key => ({
                publicKey: key.publicKey,
                _id: key._id
            }));
            return person;
        });

        const token = jwt.sign({ id: validUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: true, 
            sameSite: 'None',
        });

        return sendSuccess(res, 'Logged in successfully.', userObject, 200);
    } catch (error) {
        console.log(error);
        return sendError(res, 'Sign in failed. Try again later', null, 500);
    }
};

export const signout = async (req, res, next) => {
    try {
        res.clearCookie('access_token');
        return sendSuccess(res, 'Logged out successfully.', null, 200);
    } catch (error) {
        console.error('Signout error:', error); 
        return sendError(res, 'Sign out failed. Try again later.', null, 500);
    }
};

export const renewUserKeys = async (req, res, next) => {
    try {
        const { privateKey, publicKey } = generateECCKeys();
        const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET;
        const { encrypted, keyIv, keySalt } = encryptPrivateKey(
            privateKey.export({ format: 'pem', type: 'pkcs8' }),
            PRIVATE_KEY_SECRET
        );

        const user = await User.findById(req.userId);

        if (!user) {
            return sendError(res, 'User not found.', null, 404);
        }

        const newKey = {
            publicKey: publicKey.export({ format: 'pem', type: 'spki' }),
            encryptedPrivateKey: encrypted,
            iv: keyIv,
            salt: keySalt
        };

        user.keys.push(newKey);

        user.activeKeyId = user.keys[user.keys.length - 1]._id;

        await user.save();

        return sendSuccess(res, 'Keys renewed successfully.', null, 200);
    } catch (error) {
        console.error('Error renewing keys:', error); 
        return sendError(res, 'Renewing keys process failed. Try again later.', null, 500);
    }
};
