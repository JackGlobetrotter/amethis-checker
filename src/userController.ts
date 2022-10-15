import { Request, Response } from 'express'
import { addMailAddress, removeMailAddress } from './mailinglistManager'

const addMail = async (req: Request, res: Response): Promise<Response> => {

    await addMailAddress(req.body.email, req.body.password); 
    return res.send("OK")

}

const removeMail = async(req: Request, res: Response): Promise<Response> => {

    await removeMailAddress(req.body.email, req.body.password); 
    return res.send('OK');
}


export { addMail, removeMail }