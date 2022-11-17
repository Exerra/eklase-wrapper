type Schedule = Array<{
	name: string,
	subject: string,
	homework: {
		value: string,
		teacher: string,
		dates: {
			assigned: string,
			edited: string
		},
		attachments: Array<{
			name: string,
			url: string
		}>,
		score: string,
		type: "lesson" | "note"
	}
}>[]