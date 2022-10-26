import axios from 'axios'
import { Response, Request } from 'express';
import jsum from 'jsum'
import { mail } from './mail';
import { fileExists, getMailinglist } from './mailinglistManager';
import AWS from "aws-sdk";
const s3 = new AWS.S3()

const amethisFile = process.env.AMETHISLISTFILENAME || 'amethis.txt';


const getData = async (req: Request, expressResponse: Response): Promise<Response> => {
    console.log('checking now');
    return axios({
        method: 'post',
        url: 'https://amethis.doctorat-bretagneloire.fr/amethis-server/formation/gestion/getAll',
        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        data: 'page=0&size=1000&sort=code&direction=1&search=%7B%22etatId%22:%5B%222%22%5D,%22periodeRegExp%22:%5B%22now%22,%22next%22%5D%7D&type=vueFormations'
    })
        .then(async (res) => {
            console.log('got data');
            if (res.status === 200 && Array.isArray(res.data.data)) {

                const file = await fileExists(amethisFile) ? await s3.getObject({
                    Bucket: process.env.BUCKET as string,
                    Key: amethisFile,
                }).promise() : undefined;
                const rawData = file && file.Body ? file.Body.toString() : "";

                const data: Array<string> = rawData.length > 0 ? JSON.parse(rawData) : new Array();

                if (jsum.digest(data, "MD5", "hex") !== jsum.digest(res.data.data, "MD5", "hex")) {
                    console.log(`updating because: 1: ${jsum.digest(data, "MD5", "hex")}`)
                    console.log(`2: ${jsum.digest(res.data.data, "MD5", "hex")}`)
                    const oldIds = data.map((i: any) => i.id);

                    var sendmail = data.length !== 0 && (res.data.data.filter((i: any) => !oldIds.includes(i.id))).length > 0
                        ; //only send if new data available and not on olddata change
                    console.log(`old data lenght :${data.length} vs new data: ${res.data.data.length}`)
                    console.log(`New ids :${(res.data.data.filter((i: any) => !oldIds.includes(i.id))).map((i: any) => `${i.id}: ${i.intitule}`).join()}`)
                     await s3.putObject({
                          Bucket: process.env.BUCKET as string,
                          Key: amethisFile,
                          Body: JSON.stringify(res.data.data)
                      }).promise()
                      
                    const ml = await getMailinglist();


                    if (sendmail && ml.length > 0) {

                        const mailData = res.data.data.filter((i: any) => !oldIds.includes(i.id)).map((i: any) => {
                            return {
                                id: i.id,
                                code: i.code,
                                intitule: i.intitule,
                                libelleCategorie: i.libelleCategorie,
                                dureeFormatee: i.dureeFormatee,
                                libelleOrganisateur: i.libelleOrganisateur,
                                seances: []
                            }

                        })
                        for (let i = 0; i < mailData.length; i++) {
                            await axios(
                                {
                                    method: 'post',
                                    url: 'https://amethis.doctorat-bretagneloire.fr/amethis-server/formation/gestion/getAll',
                                    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                                    data: `page=0
                                            &size=-1
                                            &sort=libelleSiteSession,sessionNom,dateSeance,heureDebut
                                            &direction=1
                                            &search=%7B%22formationId%22:${mailData[i].id},%22etatId%22:%222%22%7D
                                            &type=vueSeances`
                                }).then(e => {
                                    if (e.status === 200) {
                                        mailData[i].seances = e.data.data;

                                    }
                                    else console.log(`ERROR fetching data ${mailData[i].id}: ${JSON.stringify(e)}`)

                                })
                                .catch(e => {
                                    console.log(e)
                                })

                        }
                        
                        await mail.sendMail({
                            from: process.env.MAILADDRESS || "",
                            bcc: (await getMailinglist()).join(','),
                            subject: "Amethis a été mis à jour!!!",
                            text: `Amethis a été mis à jour!!! Formations ajoutées: ${mailData.map((i: any) => `${i.code}: ${i.intitule} (${i.libelleCategorie}) - ${i.dureeFormatee} par ${i.libelleOrganisateur}`).join()}`,
                            html: `<p>Amethis a été mis à jour!!!</p>Formations ajoutées: </br>${mailData.map((i: any) => `${i.code}: <b><a href="https://amethis.doctorat-bretagneloire.fr/amethis-client/formation/gestion/formation/${i.id}">${i.intitule}</a> (${i.dureeFormatee})</b> - ${i.libelleCategorie} - <i> ${i.libelleOrganisateur}</i>
                            <ul>
                            ${i.seances.map((seance: any) => {
                                return `<li>${seance.dateSeance} (${seance.heureDebut}-${seance.heureFin}) - ${seance.adresse}</li>`
                            }).join('')}
                            </ul>`).join('</br>')}`
                        }).then(() => console.log('mails sucessfully send')).catch(() => console.log('error sending mails'))
                    }
                }
            }

            return expressResponse.send("Cron task executed successfully");
        })
        .catch(ex => {
            console.log(ex)
            return expressResponse.send("Cron task execution failed");
        })
}


function sendMail(data: any) {
    mail.sendMail({
        from: process.env.MAILADDRESS || "",
        bcc: "jakob.dickert@outlook.com", //(await getMailinglist()).join(','),
        subject: "Amethis a été mis à jour!!!",
        text: `Amethis a été mis à jour!!! Formations ajoutées: ${data.map((i: any) => `${i.code}: ${i.intitule} (${i.libelleCategorie}) - ${i.dureeFormatee} par ${i.libelleOrganisateur}`).join()}`,
        html: `<p>Amethis a été mis à jour!!!</p>Formations ajoutées: </br>${data.map((i: any) => `${i.code}: <a href="https://amethis.doctorat-bretagneloire.fr/amethis-client/formation/gestion/formation/${i.id}">${i.intitule}</a> (${i.libelleCategorie}, ${i.dureeFormatee}) par ${i.libelleOrganisateur}`).join('</br>')}`
    }).then(() => console.log('mails sucessfully send')).catch(() => console.log('error sending mails'))
}


export { getData }