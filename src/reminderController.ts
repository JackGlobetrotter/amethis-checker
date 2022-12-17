import express from "express";
import { fileExists, getMailinglist } from "./mailinglistManager";
import AWS from "aws-sdk";
import { mail } from "./mail";
import axios from "axios";
import bcrypt from 'bcrypt';
import { DEV } from ".";

const s3 = new AWS.S3();
const reminderFile = process.env.REMINDERFILENAME || 'reminder.txt';

async function addReminder(id: number, start: number, end: number) {

    const data = await getReminderData();

    //if not present already (for some reson)
    if (!data[id])
        data[id] = {
            mails: [],
            start,
            end,
            id
        };

    await s3.putObject({
        Bucket: process.env.BUCKET as string,
        Key: reminderFile,
        Body: JSON.stringify(data)
    }).promise()
}

async function checkReminder(req: express.Request, res: express.Response) {

    const data = await getReminderData();
    const today = new Date().setHours(1, 0, 0, 0);;

    await Promise.all(Object.values(data).map(async (value) => {

        if (today >= value.start) {
            if (value.mails.length > 0) {
                //get formation data
                const supplementerayData = {
                    intitule: "",
                    code: ""
                };

                await axios(
                    {
                        method: 'post',
                        url: 'https://amethis.doctorat-bretagneloire.fr/amethis-server/formation/gestion/getAll',
                        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                        data: `page=0
                    &size=-1
                    &sort=id
                    &direction=1
                    &search=%7B%22id%22:%20${value.id}%7D
                    &type=vueFormations`
                    })
                    .then(res => {

                        if (res.status === 200) {
                            supplementerayData.intitule = res.data.data[0].intitule;
                            supplementerayData.code = res.data.data[0].code;
                        }
                    })
                    .catch(e => {
                        console.log(e)
                    })

                //send mail

                await mail.sendMail({
                    from: process.env.MAILADDRESS || "",
                    bcc: value.mails.join(','),
                    subject: `Inscriptions ouvertes - ${supplementerayData.intitule}`,
                    text: `Inscriptions ouvertes pour la formation: ${supplementerayData.code} - ${supplementerayData.intitule}`,
                    html: `<p>Inscriptions ouvertes pour la formation: ${supplementerayData.code} - <a href="https://amethis.doctorat-bretagneloire.fr/amethis-client/formation/gestion/formation/${value.id}">${supplementerayData.intitule}</a></p>                
                `
                }).then(() => {
                    console.log('Reminder mails sucessfully send');
                    (data[value.id] as any) = null;
                    //remove from reminder list; 
                }).catch(() => console.log('error sending mails'))

            }
            else {
                (data[value.id] as any) = null;
            }
        }
    }));

    Object.keys(data).forEach(key => {
        if (data[key] === null)
            delete (data[key]);
    })

    await s3.putObject({
        Bucket: process.env.BUCKET as string,
        Key: reminderFile,
        Body: JSON.stringify(data)
    }).promise()

    return res.send("OK");
}


async function getReminderData(): Promise<IReminderData> {

    const file = await fileExists(reminderFile) ? await s3.getObject({
        Bucket: process.env.BUCKET as string,
        Key: reminderFile,
    }).promise() : undefined;

    return (file && file.Body) ? JSON.parse(file.Body.toString()) : {};
}

async function addMailToReminder(req: express.Request, res: express.Response) {


    const id = parseInt(req.query.id && typeof req.query.id == "string" ? req.query.id : "0");
    if (id === 0) return res.send("FALSE ID");

    const mail = req.query.mail;
    if (!mail || typeof mail !== "string")
        return res.send("INVALID MAIL");

    const ml = DEV ? [process.env.DEV_MAIL] : await getMailinglist();
    if (typeof mail == "string" && ml.includes(mail)) {

        const data = await getReminderData();

        if (!data[id])
            return res.send("NO REMINDER TO SET FOR THIS ID");

        if (!data[id].mails.includes(mail))
            data[id].mails.push(mail);

        await s3.putObject({
            Bucket: process.env.BUCKET as string,
            Key: reminderFile,
            Body: JSON.stringify(data)
        }).promise()

        console.log("mail added");

    }
    return res.send("OK");
}

async function clearReminders(req: express.Request, res: express.Response) {
    let auth_password = process.env.PASSWORDHASH || '';
    if (req.query.password && typeof req.query.password == "string") {
        if (!bcrypt.compareSync(req.query.password, auth_password))
            return res.send("FALSE PASWORD")

        await s3.deleteObject({
            Bucket: process.env.BUCKET as string,
            Key: reminderFile,
        }).promise()
        return res.send("ok");
    }
    return res.send("PROVIDE PASSWORD");
}

interface IReminderDataEntry {
    start: number,
    end: number,
    mails: Array<string>,
    id: number
}

interface IReminderData {
    [id: string]: IReminderDataEntry
}

export { addReminder, addMailToReminder, checkReminder, clearReminders }