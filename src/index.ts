import { EklaseError } from "./util/log";
import { Credentials } from "./util/login";
import eklaseReq from "./util/requests";
import urls from "./util/urls";
import { Mail } from "./types/mail";
import { formatMail } from "./util/mail";
// @ts-ignore
import * as cheerio from "cheerio"

/*
	TODO:
	 Finish up the getInfo command (for some reason eklase isnt sending the user data (even tho on browser it does)
	 Add types
 */

export default class EKlase {
	private cookie = {
		name: ".ASPXAUTH_EKLASE_3",
		value: ""
	}

	private creds: Credentials = {
		username: "",
		password: ""
	}

	constructor(username: string, password: string) {
		if (!username || !password) {
			throw new EklaseError(1, "No credentials supplied")
		}

		this.creds = {
			username,
			password
		}
	}

	mail = {
		getIDs: async () => {
			return await eklaseReq.get<number[]>( urls.api, "/family/mail/folder-message-ids/standardType_fmft_inbox", this.creds )
		},

		get: async (ids: number[]) => {
			let req = await eklaseReq.post<Array<Mail>>(urls.api, "/family/mail/messages", this.creds, {
				messageIds: ids
			})

			let formattedMails = []

			for (let mail of req.data) {
				formattedMails.push(await formatMail(mail))
			}

			req.data = formattedMails

			return req
		},

		getAll: async () => {
			let { data } = await this.mail.getIDs()

			return await this.mail.get(data)
		}
	}

	user = {
		getSchedule: async (date?: string): Promise<Schedule> => {
			let diary = (await eklaseReq.get<any>(urls.base, `/Family/Diary${date ? `?Date=${date}` : ""}`, this.creds)).data

			let temp: any[] = []

			// @ts-ignore
			const $ = cheerio.load(diary)
			// @ts-ignore
			$(".lessons-table", "html").each(async (idx, el) => {
				// @ts-ignore
				let tbody = $(el).find("tbody")
				let temp2: any = []

				tbody.find("tr").each(async (idb, el2) => {
					let name = $(el2).find(".first-column").find("div").find(".title").text().trim()
					let subject = $(el2).find(".subject")
					let score = $(el2).find(".score")
					let homework = $(el2).find(".hometask")

					let formatted = {
						subject: "",
						homework: {
							value: "",
							teacher: "",
							dates: {
								assigned: "",
								edited: ""
							},
							attachments: []
						},
						score: "",
						type: "lesson"
					}

					if (subject.text().trim() == "") {
						formatted.subject = subject.text().trim()
					} else {
						formatted.subject = subject.find("div").find("p").text().trim()
					}

					if (score.text().trim() == "") {
						formatted.score = score.text().trim()
					} else {
						formatted.score = score.find("span").text().trim()
					}

					if ($(el2).find(".first-column").find("div").find(".number").find(".number--lessonNotInDay").text().trim() == "·") {
						formatted.type = "note"
					}

					if (homework.text().trim() != "") {
						let regex = new RegExp(/(\d{2}\.\d{2}\.\d{4})\. (\d{1,2}\:\d{2})\: (.{0,99})/)
						let execArr = regex.exec(homework?.find("span")?.attr("title")!)

						let assignedAt = ""
						let editedAt = ""
						let teacher = ""
						let attachments: any = []

						if (execArr == null) {
							assignedAt = ""
							teacher = ""
						} else {
							let oldDate = execArr[1].split('.')
							let isoDate = [oldDate[2], oldDate[1], oldDate[0]].join("-")
							assignedAt = `${isoDate}T${execArr[2]}:00.000Z`
							teacher = execArr[3]

							if (teacher.includes("(")) {
								regex = new RegExp(/(\d{2}\.\d{2}\.\d{4})\. (\d{1,2}\:\d{2})/)

								let execArr2 = regex.exec(teacher.substring(teacher.indexOf("("), teacher.indexOf(")")))

								let editedOldDate = execArr2?.[1].split('.')
								let editedIsoDate = [editedOldDate?.[2], editedOldDate?.[1], editedOldDate?.[0]].join("-")

								teacher = teacher.substring(0, teacher.indexOf(" ("))
								editedAt = `${editedIsoDate}T${execArr2?.[2]}:00.000Z`
							}
						}

						// @ts-ignore
						homework.find("a").each(async (yetAnotherIdx, andAnotherEl) => {
							attachments.push({
								name: $(andAnotherEl).text(),
								url: `${urls.base}${$(andAnotherEl).attr("href")}`
							})
						})

						formatted.homework = {
							value: homework.find("span").find("p").text().trim(),
							teacher: teacher,
							dates: {
								assigned: assignedAt,
								edited: editedAt
							},
							attachments
						}
					}

					let obj = {
						name,
						subject: formatted.subject,
						homework: formatted.homework,
						score: formatted.score,
						type: formatted.type
					}

					temp2.push(obj)
				})

				temp.push(temp2)
			})

			return temp
		},

		settings: {
			update: {
				password: async (newP: string) => {
					 let d = await eklaseReq.post<[]>(urls.base, "/Family/PasswordSettings", this.creds, {
						CurrentPassword: this.creds.password,
						NewPassword: newP,
						NewPasswordConfirmation: newP
					})

					this.creds.password = newP // Sets the new password as creds for all future requests

					return d
				}
			}
		}
	}
}
