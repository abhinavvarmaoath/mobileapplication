import { ApiError } from "./errors";
import { type ApiRequest, fetchTransport, type Transport } from "./transport";

/** Sends a request and returns the body of a successful answer. */
export type Send = (request: ApiRequest) => Promise<string>;

export interface SenderOptions {
	timeoutMs?: number;
	transport?: Transport;
}

export function createSender(options: SenderOptions = {}): Send {
	const { timeoutMs = 15_000, transport = fetchTransport } = options;
	return async (request) => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const response = await transport(request, controller.signal);
			if (response.status < 200 || response.status >= 300) {
				throw new ApiError(
					"status",
					`The server answered ${response.status}`,
					response.status,
				);
			}
			return response.body;
		} catch (error) {
			if (error instanceof ApiError) throw error;
			if (controller.signal.aborted) {
				throw new ApiError("timeout", "The server took too long to answer");
			}
			throw new ApiError("network", "The server could not be reached");
		} finally {
			clearTimeout(timer);
		}
	};
}
