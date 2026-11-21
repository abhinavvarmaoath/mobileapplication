/** Why a call to the backend gave no usable answer. */
export type ApiFailure = "network" | "timeout" | "status" | "shape";

export class ApiError extends Error {
	constructor(
		readonly failure: ApiFailure,
		message: string,
		readonly status?: number,
	) {
		super(message);
		this.name = "ApiError";
	}
}
