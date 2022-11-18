export class EklaseError extends Error {
	constructor(id: number, message: string, ...args: any[]) {
		super(`Error ${id} - ${message}`);
	}
}