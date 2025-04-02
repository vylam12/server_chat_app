import express from "express";
import cors from "cors";
import initWebRoutes from "./routes/index.js";
const app = express();
import dotenv from "dotenv";


app.set('view engine', 'ejs');
app.set('views', './views');

app.use(cors())
app.use(express.json())

app.use(express.urlencoded({ extended: true }));

dotenv.config();
const port = process.env.PORT || 9000;


import connectDB from "./config/connect.js";
connectDB()

initWebRoutes(app);


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})