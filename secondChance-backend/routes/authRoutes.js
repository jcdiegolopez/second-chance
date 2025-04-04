const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');
require('dotenv').config()
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET;

router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName }  = req.body;
        if(!email || !password || !firstName || !lastName) return res.status(400).json({message:"You need to provide firstName, lastName, password and email"})
        const db = await connectToDatabase();
        const collection = db.collection("users")
        const userExist = await collection.findOne({email: email});
        if(userExist) return res.status(400).json({message: "This email already exists"})
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userCreated = await collection.insertOne({
            email: email, 
            password: hashedPassword,
            firstName,
            lastName,
            createdAt : new Date()
        });

        const payload = {
            user: {
                id: userCreated.insertId
            }
        }
        const authtoken = jwt.sign(payload, JWT_SECRET)
        ;
        logger.info('User registered successfully');
        res.status(201).json({authtoken, email})
        
    } catch (error) {
       next(error); 
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password }  = req.body;
        if(!email || !password ) return res.status(400).json({message:"You need to provide a password and email"})
        const db = await connectToDatabase();
        const collection = db.collection("users")
        const userExist = await collection.findOne({email: email});
        if(!userExist) return res.status(400).json({message: "This email is not registered"})
        const result = await bcrypt.compare(password, userExist.password);
        
        if(!result) return res.status(401).json({message:"Invalid credentials"})

        const payload = {
            user: {
                id: userExist._id.toString()
            }
        }
        const authtoken = jwt.sign(payload, JWT_SECRET)
        ;
        logger.info('User logged successfully');
        res.status(200).json({authtoken, userName: userExist.firstName, userEmail: userExist.email})
        
    } catch (error) {
       next(error); 
    }
});


router.put('/update', async (req, res) => {
    // Task 2: Validate the input using `validationResult` and return approiate message if there is an error.
    const errors = validationResult(req);
    // Task 3: Check if `email` is present in the header and throw an appropriate error message if not present.
    if (!errors.isEmpty()) {
        logger.error('Validation errors in update request', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const email = req.headers.email;
        if (!email) {
            logger.error('Email not found in the request headers');
            return res.status(400).json({ error: "Email not found in the request headers" });
        }
        //Task 4: Connect to MongoDB
        const db = await connectToDatabase();
        const collection = db.collection("users");
        //Task 5: Find user credentials
        const existingUser = await collection.findOne({ email });
        if (!existingUser) {
            logger.error('User not found');
            return res.status(404).json({ error: "User not found" });
        }
        existingUser.firstName = req.body.name;
        existingUser.updatedAt = new Date();
        //Task 6: Update user credentials in DB
        const updatedUser = await collection.findOneAndUpdate(
            { email },
            { $set: existingUser },
            { returnDocument: 'after' }
        );
        //Task 7: Create JWT authentication with user._id as payload using secret key from .env file
        const payload = {
            user: {
                id: updatedUser._id.toString(),
            },
        };
        const authtoken = jwt.sign(payload, JWT_SECRET);
        logger.info('User updated successfully');
        res.json({ authtoken });
    } catch (error) {
        logger.error(error);
        return res.status(500).send("Internal Server Error");
    }
});


module.exports = router;