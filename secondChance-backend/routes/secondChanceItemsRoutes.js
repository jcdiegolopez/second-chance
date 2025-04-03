const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();''
const connectToDatabase = require('../models/db');
const logger = require('../logger');
const { ObjectId } = require('mongodb');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });


// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const secondChanceItems = await collection.find({}).toArray();
        res.json(secondChanceItems);
    } catch (e) {
        logger.console.error('oops something went wrong', e)
        next(e);
    }
});

// Add a new item
router.post('/', upload.single('file'), async(req, res,next) => {
    try {
        let secondChanceItem = req.body
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems")
        const lastElement = await collection.find().sort({ id: -1 }).limit(1).toArray();
        secondChanceItem.id = lastElement[0]?.id ? String(Number(lastElement[0].id) + 1) : "0";
        secondChanceItem.date_added =  Math.floor(new Date().getTime() / 1000);
        await collection.insertOne(secondChanceItem)
        res.status(201).json(secondChanceItem);
    } catch (e) {
        next(e);
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        const {id} = req.params;
        const db = await connectToDatabase()
        const collection = db.collection("secondChanceItems")
        const item = await collection.findOne({id: id});
        console.log(item)
        if(!item) return res.status(404).json({ error: "Not found"})

        res.status(200).json(item)
    } catch (e) {
        next(e);
    }
});

// Update and existing item
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { category, condition, age_days, description } = req.body;
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const item = await collection.findOne({ id: id });
        if (!item) return res.status(404).json({ error: "Not found" });
        const age_years = Number((age_days / 365).toFixed(1));
        const updatedAt = new Date();
        const updateResult = await collection.findOneAndUpdate(
            { id },
            { 
                $set: { 
                    category, 
                    condition, 
                    age_days, 
                    age_years, 
                    description, 
                    updatedAt 
                } 
            },
            { returnDocument: 'after' } 
        );

        if (updateResult) {
            res.json({ uploaded: "success", updatedItem: updateResult });
        } else {
            res.status(500).json({ uploaded: "failed" });
        }

    } catch (e) {
        next(e);
    }
});


// Delete an existing item
router.delete('/:id', async(req, res,next) => {
    try {
        const {id} = req.params;
  
        const db = await connectToDatabase()
        const collection = db.collection("secondChanceItems")
        const item = await collection.findOne({"id": id});
        if(!item) return res.status(404).json({ error: "Not found"})
        console.log(item)
        const deletedItem = await collection.findOneAndDelete({ "id": id });
        if (!deletedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({
            message: "Item deleted successfully",
            deletedItem: deletedItem
        })
    } catch (e) {
        next(e);
    }
});

module.exports = router;
