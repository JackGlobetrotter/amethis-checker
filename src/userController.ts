import { Request, Response } from 'express'
import { addMailAddress, removeMailAddress } from './mailinglistManager'

const addMail = async (req: Request, res: Response): Promise<Response> => {

    if (await addMailAddress(req.body.email, req.body.password))
        return res.send('OK')
    else
        return res.sendStatus(401)

}

const removeMail = async (req: Request, res: Response): Promise<Response> => {

    if (await removeMailAddress(req.body.email, req.body.password))
        return res.send('OK')
    else
        return res.sendStatus(401)
}


export { addMail, removeMail }