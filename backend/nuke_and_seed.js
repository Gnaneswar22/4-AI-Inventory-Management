'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://harshitindigibilli:qjwfbUuhtE6Pcn32@cluster0.hvxvofb.mongodb.net/stocksense?retryWrites=true&w=majority&appName=Cluster0';

async function nuke() {
    console.log('\n======================================================');
    console.log('  Nuking StockSense Legacy Data (Except Users)');
    console.log('======================================================\n');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB database.');

        const db = mongoose.connection.db;

        // Collections to drop
        const collectionsToDrop = ['products', 'sales', 'stocklogs', 'usages', 'salescounters', 'notifications', 'forecastdatas'];

        // Get existing lists
        const collections = await db.listCollections().toArray();
        const existingNames = collections.map(c => c.name);

        for (const cName of collectionsToDrop) {
            if (existingNames.includes(cName)) {
                await db.dropCollection(cName);
                console.log(`Dropped collection: ${cName}`);
            } else {
                console.log(`Skipped missing collection: ${cName}`);
            }
        }

        console.log('\n======================================================');
        console.log('  Nuke Complete! Ready for migrate_to_mongo.js');
        console.log('======================================================\n');

    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

nuke();
