import express from "express";
import path from "path";
import { getData } from "./cronCrontroller";
import { getMailinglist, sendCustomMessage } from "./mailinglistManager";
import { addMail, removeMail } from "./userController";
import { validateMail, validatePassword } from './validator'

const router = express.Router();

router.post('/cron', getData)

router.get('/', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(__dirname, '../static/', "mainPage.html"))
})
router.post('/addMail', validateMail, validatePassword, addMail)

router.post('/removeMail', validateMail, validatePassword, removeMail)

router.get('/mailtest', async  (req: express.Request, res: express.Response) => {
    await sendCustomMessage("Test message from amethis-checker", "TEST MESSAGE FROM AMETHIS-CHECKER", (await getMailinglist())[0]);
    res.send("OK"); 
})

export { router }