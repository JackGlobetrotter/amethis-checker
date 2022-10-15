import { Request, Response } from 'express'
import { addMailAddress, removeMailAddress } from './mailinglistManager'

const addMail = (req: Request, res: Response): Response => {

    addMailAddress(req.body.email, req.body.password); 
    return res.send("OK")

}

const removeMail = (req: Request, res: Response): Response => {

    removeMailAddress(req.body.email, req.body.password); 
    return res.send('OK');
}


export { addMail, removeMail }