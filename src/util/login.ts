import axios from "axios";
import urls from "./urls";
import { EklaseError } from "./log";

export type Credentials = {
	username: string,
	password: string
}

const login = async ({ username, password }: Credentials) => {
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
			UserName: username,
			Password: password
		}),
		maxRedirects: 0,
		validateStatus: status => {
			return status < 500
		}
	})

	let aspxauth = data.headers["set-cookie"]![0]

	let regex = new RegExp(/\.ASPXAUTH.{1,99}=([^;]{1,9999})/)

	let exec = regex.exec(aspxauth)

	if (exec![1] == "Lax") throw new EklaseError(2, "Incorrect username and/or password provided")

	return `.ASPXAUTH_EKLASE_3=${exec![1]}`
}

export default login