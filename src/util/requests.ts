import urls from "./urls";
import login, { Credentials } from "./login";
import axios from "axios";

export interface EKlaseRequest<T> {
	status: number,
	data: T
}

const get = async <T>(prefix: urls, path: string, credentials: Credentials): Promise<EKlaseRequest<T>> => {
	let res = await axios.get(prefix + path, {
		headers: {
			Cookie: await login(credentials),
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:53.0) Gecko/20100101 Firefox/53.0"
		}
	})

	let status = res.status
	let data = res.data

	return { status, data }
}

const post = async <T>(prefix: urls, path: string, credentials: Credentials, body: Object): Promise<EKlaseRequest<T>> => {
	let res = await axios({
		method: "post",
		url: prefix + path,
		headers: {
			Cookie: await login(credentials),
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:53.0) Gecko/20100101 Firefox/53.0"
		},
		data: body,
		maxRedirects: 0
	})

	let status = res.status
	let data = res.data

	return { status, data }
}

const eklaseReq = {
	get,
	post
}

export default eklaseReq