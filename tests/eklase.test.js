const EKlaseWrapper = require("../index")
const util = require("util")
require("dotenv").config()

expect.extend({
	/**
	 * @typedef {jest.Expect} expect
	 * @param type - boolean, number, object
	 * @returns {{pass: boolean, message: (function(): string)}|{pass: boolean, message: (function(): string)}}
	 */
	toBeType(received, type) {
		return typeof received === type ? {
			message: () => `expected ${received} to be ${type}`,
			pass: true
		} : {
			message: () => `expected ${received} to be ${type}`,
			pass: false
		};
	},
	/**
	 * @typedef {jest.Expect} expect
	 * @param received
	 * @param value - Which key to look for
	 * @param type - boolean, number, object
	 * @returns {{pass: boolean, message: (function(): string)}}
	 */
	haveKey(received, value, type) {
		try {
			expect(received).toHaveProperty(value)
			expect(received[value]).toBeType(type)
		} catch (e) {
			return {
				message: () => `expected ${util.inspect(received, false, 10, true)} to have ${value} of type ${type}`,
				pass: false
			}
		}

		return {
			message: () => `idk`,
			pass: true
		}
	}
});

const checkMail = (mail) => {
	expect(mail).haveKey("id", "number")
	expect(mail).haveKey("subject", "string")
	expect(mail).haveKey("body", "string")
	expect(mail).haveKey("timeCreated", "string")
	expect(mail).haveKey("authorName", "string")

	expect(mail).haveKey("recipientsData", "object")
	expect(mail.recipientsData).haveKey("hideRecipients", "boolean")
	expect(mail.recipientsData).haveKey("loadRecipientsSeparately", "boolean")
	expect(mail.recipientsData).haveKey("recipients", "object")

	expect(mail).haveKey("attachments", "object")
	expect(mail).haveKey("status", "string")
	expect(mail).haveKey("followUpStatus", "string")
	expect(mail).toHaveProperty("previousMessageId")
	expect(mail).toHaveProperty("draftType")
	expect(mail).haveKey("authorId", "number")
	expect(mail).toHaveProperty("draftRecipients")
}

describe("Wrapper", () => {

	let wrapper;
	let initialised = false

	beforeEach(async () => {
		wrapper = new EKlaseWrapper(process.env.EKLASE_USERNAME, process.env.EKLASE_PASSWORD)
		initialised = await wrapper.initialize()
	})

	it("can initialise", () => {
		expect(initialised).toBe(true)
	})

	it("can fetch schedule", async () => {
		let schedule = await wrapper.getSchedule()

		schedule.forEach(d => {
			d.forEach(a => {
				let firstItem = a
				expect(firstItem).haveKey("name", "string")

				expect(firstItem).haveKey("subject", "string")

				expect(firstItem).haveKey("homework", "object")
				expect(firstItem.homework).haveKey("teacher", "string")
				expect(firstItem.homework).haveKey("dates", "object")
				expect(firstItem.homework.dates).haveKey("assigned", "string")
				expect(firstItem.homework.dates).haveKey("edited", "string")
				expect(firstItem.homework).haveKey("attachments", "object")

				expect(firstItem).haveKey("score", "string")

				expect(firstItem).haveKey("type", "string")
			})
		})
	})

	describe('user section', () => {
		it("can fetch user info", async () => {
			let info = await wrapper.user.getInfo()

			info.forEach(d => {
				expect(d).haveKey("identity", "object")
				expect(d.identity).haveKey("name", "string")
				expect(d.identity).haveKey("surname", "string")

				expect(d).haveKey("class", "string")
				expect(d).haveKey("school", "string")
				expect(d).haveKey("id", "string")
				expect(d).haveKey("subscription", "boolean")
				expect(d).haveKey("classID", "string")
				expect(d).haveKey("redirectURL", "string")
				expect(d).haveKey("renderNotifications", "boolean")
			})
		})

		it("can get recent grades", async () => {
			let grades = await wrapper.user.getGrades()

			grades.forEach(g => {
				expect(g).haveKey("lesson", "string")
				expect(g).haveKey("type", "string")

				expect(g).haveKey("score", "object")

				expect(g.score).haveKey("value", "number")
				expect(g.score).haveKey("type", "string")
			})
		})
	});

	describe("mail section", () => {
		it("can get mail ids", async () => {
			let ids = await wrapper.mail.getIDs()

			expect(ids).toBeType("object")

			ids.forEach(id => {
				expect(id).toBeType("number")
			})
		})

		it("can get mail", async () => {
			let ids = await wrapper.mail.getIDs()
			let mails = await wrapper.mail.get([ids[0]])

			mails.forEach(checkMail)
		})

		it("can get all mail", async () => {
			let mails = await wrapper.mail.getAll()

			mails.forEach(checkMail)
		})
	})
})