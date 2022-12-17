import express from "express";
import path from "path";
import { DEV } from ".";
import { ERROR } from "./constants";
import { getData } from "./cronCrontroller";
import { clearAll, getMailinglist, sendCustomMessage } from "./mailinglistManager";
import { addMailToReminder, checkReminder, clearReminders } from "./reminderController";
import { addMail, removeMail } from "./userController";
import { validateMail, validatePassword } from './validator'

const router = express.Router();

router.post('/cron', getData)

router.get('/', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(__dirname, '../static/', "mainPage.html"))
})
router.post('/addMail', validateMail, validatePassword, addMail)

router.post('/removeMail', validateMail, validatePassword, removeMail)

if (DEV) {

    router.get('/mailtest', async (req: express.Request, res: express.Response) => {
        await sendCustomMessage("Test message from amethis-checker", "TEST MESSAGE FROM AMETHIS-CHECKER", process.env.DEV_MAIL!);
        res.send("OK");
    })
    router.get('/clear', async (req: express.Request, res: express.Response) => {
        if (req.query.password && typeof req.query.password == "string")
            if (await clearAll(req.query.password) === ERROR.NONE) return res.send("OK"); else return res.send("ERROR")
    })

    router.get('/clearReminders', clearReminders)
}

router.get('/addReminder', addMailToReminder)
router.post('/checkReminder', checkReminder)

export { router }