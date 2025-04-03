const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');
require('dotenv').config()
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

module.exports = router;