import bodyParser from "body-parser";
import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import { router } from "./router";

const PORT: number = parseInt(process.env.PORT || "5000" as string, 10);

const app = express();

app.use(bodyParser.urlencoded());//{ extended: true }))

app.use(router)

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});


