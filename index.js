const axios = require("axios")

let urls = {
	api: "https://my.e-klase.lv/api",
	base: "https://my.e-klase.lv"
}

let cookie = {
	name: ".ASPXAUTH_EKLASE_3",
	value: ""
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

	async initialize() {
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

		setInterval(() => {
			axios.get(`${urls.base}/KeepAlive`, {
				headers: this.headers
			})
		},40000)

		return true
	}

	mail = {
		getIDs: async () => {
			return await (await axios.get(`${urls.api}/family/mail/folder-message-ids/standardType_fmft_inbox`, { headers: this.headers })).data
		}
	}
}

module.exports = EklaseWrapper