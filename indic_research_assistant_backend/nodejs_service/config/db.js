
const mongoose = require('mongoose');
const dns = require("dns");
const dotenv   = require("dotenv");
dotenv.config();

if (process.env.NODE_ENV === "development") {
  // dns.setServers(["8.8.8.8", "8.8.4.4"]);
  const dnsServers = (process.env.DNS_SERVERS || "8.8.8.8,8.8.4.4")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (dnsServers.length > 0) {
  dns.setServers(dnsServers);
}

}
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;