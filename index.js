const axios = require("axios")
const cheerio = require("cheerio")
const {is} = require("cheerio/lib/api/traversing");

let urls = {
	api: "https://my.e-klase.lv/api",
	base: "https://my.e-klase.lv"
}

let cookie = {
	name: ".ASPXAUTH_EKLASE_3",
	value: ""
}

const formatMail = (mail) => {
	for (let i in mail.attachments) {
		mail.attachments[i].url = `https://my.e-klase.lv/Attachment/Get/${mail.attachments[i].attachmentId}`
	}

	return mail
}


/**
 * @author Exerra
 */
class EklaseWrapper {
	constructor(username, password) {
		if (!username || !password) {
			throw new Error("No credentials supplied")
		}

		this.credentials = {
			username,
			password
		}
	}

	async initialize(keepAlive = false) {
		let data = await axios({
			method: "POST",
			url: `${urls.base}/`,
			params: {
				v: 15
			},
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			data: new URLSearchParams({
				fake_pass: "",
				UserName: this.credentials.username,
				Password: this.credentials.password
			}),
			maxRedirects: 0,
			validateStatus: status => {
				return status < 500
			}
		})

		let aspxauth = data.headers["set-cookie"][0]

		this.headers = {
			Cookie: `${cookie.name}=${/\.ASPXAUTH.{1,99}=([^;]{1,9999})/.exec(aspxauth)[1]}`
		}

		if (keepAlive) setInterval(() => {
			axios.get(`${urls.base}/KeepAlive`, {
				headers: this.headers
			})
		},40000)

		return true
	}

	mail = {
		getIDs: async () => {
			return await (await axios.get(`${urls.api}/family/mail/folder-message-ids/standardType_fmft_inbox`, { headers: this.headers })).data
		},
		get: async (ids) => {
			let mails = await (await axios({
				method: "post",
				url: `${urls.api}/family/mail/messages`,
				headers: this.headers,
				data: {
					messageIds: ids
				},
				maxRedirects: 0
			})).data

			let formattedMails = []

			for (let mail of mails) {
				let formattedMail = await formatMail(mail)

				formattedMails.push(formattedMail)
			}

			return formattedMails
		},
		getAll: async () => {
			let mailIDs = await this.mail.getIDs()

			return await this.mail.get(mailIDs)
		}
	}

	user = {
		getInfo: async () => {
			let formattedData = []

			const familyHome = await (await axios.get(`${urls.base}/Family/Home`, { headers: this.headers })).data

			const $ = cheerio.load(familyHome)
			$(".student-selector", "html").each(async (idx, el) => {
				let script = $(el).find("script").html().replace(/\n|\t/g, ' ');

				let json = /student_selector_data = (\[.{1,999}\])/.exec(script)[1]

				let data = JSON.parse(json)

				for (let d of data) {
					let { Name, Description, Id, NotificationCount, ClassId, RedirectUrl, RenderNotifications } = d

					let regex = {
						description: new RegExp(/([0-9]\..{1,9}), (.{1,999})/)
					}

					let exec = {
						description: regex.description.exec(Description)
					}

					let nameArr = Name.split(" ")

					let surname = nameArr.shift()


					let identity = {
						name: nameArr.join(" "),
						surname: surname
					}

					let obj = {
						identity,
						class: exec.description[1],
						school: exec.description[2],
						id: Id,
						classID: ClassId,
						redirectURL: RedirectUrl,
						renderNotifications: RenderNotifications
					}

					formattedData.push(obj)
				}
			})

			return formattedData
		},

		settings: {
			update: {
				password: async (oldPassword, newPassword) => {
					return await (await axios({
						method: "post",
						url: `${urls.base}/Family/PasswordSettings`,
						headers: this.headers,
						data: {
							CurrentPassword: oldPassword,
							NewPassword: newPassword,
							NewPasswordConfirmation: newPassword
						},
						maxRedirects: 0
					})).data
				}
			}
		}
	}

	async getSchedule() {
		let diary = await (await axios.get(`${urls.base}/Family/Diary?Date=10.04.2022`, { headers: this.headers })).data

		let temp = []

		const $ = cheerio.load(diary)
		$(".lessons-table", "html").each(async (idx, el) => {
			let tbody = $(el).find("tbody")
			let temp2 = []
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
					score: ""
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

				if (homework.text().trim() != "") {
					let regex = new RegExp(/(\d{2}\.\d{2}\.\d{4})\. (\d{1,2}\:\d{2})\: (.{0,99})/)
					let execArr = regex.exec(homework.find("span").attr("title"))

					let assignedAt = ""
					let editedAt = ""
					let teacher = ""
					let attachments = []

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

							let editedOldDate = execArr2[1].split('.')
							let editedIsoDate = [editedOldDate[2], editedOldDate[1], editedOldDate[0]].join("-")

							teacher = teacher.substring(0, teacher.indexOf(" ("))
							editedAt = `${editedIsoDate}T${execArr2[2]}:00.000Z`
						}
					}

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
					score: formatted.score
				}

				temp2.push(obj)
			})

			temp.push(temp2)
		})

		return temp
	}
}

module.exports = EklaseWrapper