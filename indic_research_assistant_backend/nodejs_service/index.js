const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require('cors');
const bodyParser = require('body-parser')
const connectDB = require('./config/db');
const authRoutes = require('./routes/scholar.Route');
const docRoutes = require('./routes/doc.Route');
const serverless = require("serverless-http");
require('dotenv').config()
const app = express();
 
connectDB();
 
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    // origin: 'http://localhost:5173',
    origin: ["http://localhost:5173", "https://indic-research-scholar.vercel.app"],
    credentials: true, // required for the httpOnly cookie to be sent/received
  })
);

app.get('/', (req, res) => {
  res.json({ message: 'Indic Research Assistant — Node API' });
});
 
app.use('/api/scholar', authRoutes);
app.use('/api', docRoutes);
 
// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Node API running on port ${PORT}`);
});


// module.exports = app;
// module.exports.handler = serverless(app);