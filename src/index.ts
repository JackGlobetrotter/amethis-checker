import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import express from "express";
import { mail } from "./mail";
import { router } from "./router";

dotenv.config();
const PORT: number = parseInt(process.env.PORT || "5000" as string, 10);

const app = express();

app.use(bodyParser.urlencoded());//{ extended: true }))

app.use(router)

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});