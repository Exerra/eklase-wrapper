import { Mail } from "../types/mail";

export const formatMail = (mail: Mail) => {
	for (let i in mail.attachments) {
		mail.attachments[i].url = `https://my.e-klase.lv/Attachment/Get/${mail.attachments[i].attachmentId}`
	}

	return mail
}