const axios = require("axios")
const cheerio = require("cheerio")

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
		let diary = await (await axios.get(`${urls.base}/Family/Diary`, { headers: this.headers })).data

		let temp2 = [
			[
				{
					name: "Literatura",
					subject: "Test",
					homework: "Thing"
				}
			]
		]

		let temp = []

		const $ = cheerio.load(diary)
		$(".lessons-table", "html").each(async (idx, el) => {
			let tbody = $(el).find("tbody")
			let temp2 = []
			tbody.find("tr").each(async (idb, el2) => {
				let subject = $(el2).find(".first-column").find("div").find(".title").text()

				let subjArr = subject.split(" ").filter(e => e !== "").filter(e => e !== "\n")

				let obj = {
					subject: subjArr.join(" ").replace("\n", "")
				}

				temp2.push(obj)
			})

			temp.push(temp2)
		})

		return temp
	}
}

module.exports = EklaseWrapper