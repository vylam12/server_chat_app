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
const port = 9000


import connectDB from "./config/connect.js";
connectDB()

initWebRoutes(app);


app.listen(port, "0.0.0.0", () => {
    console.log(`App listening on port http://192.168.1.6:${port}`);
})