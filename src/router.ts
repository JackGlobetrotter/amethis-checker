import express from "express";
import path from "path";
import { getData } from "./cronCrontroller";
import { addMail, removeMail } from "./userController";
import { validateMail, validatePassword } from './validator'

const router = express.Router();

router.post('/cron', getData)

router.get('/', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(__dirname, '../static/', "mainPage.html"))
})
router.post('/addMail', validateMail, validatePassword, addMail)

router.post('/removeMail', validateMail, validatePassword, removeMail)

export { router }