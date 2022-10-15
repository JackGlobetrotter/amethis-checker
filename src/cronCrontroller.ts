import axios from 'axios'
import { Response, Request } from 'express';
import jsum from 'jsum'
import { mail } from './mail';
import { getMailinglist } from './mailinglistManager';


let data = new Array();

const INTERVALL = 1800000;



const getData = async (req: Request, expressResponse: Response): Promise<Response> => {
    console.log('checking now');
    return axios({
        method: 'post',
        url: 'https://amethis.doctorat-bretagneloire.fr/amethis-server/formation/gestion/getAll',
        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        data: 'page=0&size=1000&sort=code&direction=1&search=%7B%22etatId%22:%5B%222%22%5D,%22periodeRegExp%22:%5B%22next%22%5D%7D&type=vueFormations'
    })
        .then(async (res) => {
            console.log('got data');
            if (res.status === 200 && Array.isArray(res.data.data)) {
                if (jsum.digest(data, "MD5", "hex") !== jsum.digest(res.data.data, "MD5", "hex")) {
                    console.log(`updating because: 1: ${jsum.digest(data, "MD5", "hex")}`)
                    console.log(`2: ${jsum.digest(res.data.data, "MD5", "hex")}`)
                    var sendmail = data.length !== 0 && res.data.data.length >= data.length;
                    data.splice(0, res.data.data.length, ...res.data.data)
                    data = res.data.data;
                    const ml = await getMailinglist();
                    if (sendmail && ml.length > 0)
                        await mail.sendMail({
                            from: process.env.MAILADDRESS||"",
                            to: (await getMailinglist()).join(','),
                            subject: "Amethis a été mis à jour!!!",
                            text: "Amethis a été mis à jour!!!",
                            html: "<p>Amethis a été mis à jour!!!</p>"
                        }).then(() => console.log('mails sucessfully send')).catch(() => console.log('error sending mails'))
                }
            }

            return expressResponse.send("Cron task executed successfully");
        })
        .catch(ex => {console.log(ex)
            return expressResponse.send("Cron task execution failed");})
}


export { getData }