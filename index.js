const axios = require("axios")

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
			}))

			let formattedMails = []

			for (let mail of mails.data) {
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
}

module.exports = EklaseWrapper