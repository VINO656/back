const mongoose = require('mongoose');

/**
 * Connects to MongoDB database using Mongoose
 * @param {string} uri - MongoDB connection string
 */
const connectDB = async (uri) => {
  try {
    const conn = await mongoose.connect(uri);
    console.log(`[DATABASE] MongoDB Connected Successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('[DATABASE] MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

// Listen for connection events
mongoose.connection.on('disconnected', () => {
  console.warn('[DATABASE] MongoDB connection lost.');
});

mongoose.connection.on('error', (err) => {
  console.error('[DATABASE] MongoDB error occurred:', err);
});

module.exports = connectDB;
