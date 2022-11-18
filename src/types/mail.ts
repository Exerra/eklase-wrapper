export interface Mail {
	id: number,
	subject: string,
	body: string,
	timeCreated: string,
	authorName: string,
	recipientsData: {
		hideRecipients: boolean,
		loadRecipientsSeparately: boolean,
		recipients: Array<{
			id: number,
			name: string,
			status: {
				LiteralCode: "unread" | "read"
			}
		}>
	},
	attachments: Array<{
		attachmentId: string,
		sizeInBytes: number,
		name: string,
		url?: string
	}>,
	status: "unread" | "read",
	followUpStatus: string,
	previousMessageId?: string,
	draftType?: string,
	authorId: 321,
	draftRecipients?: any
}