export interface ApiRequest {
	method: "GET" | "POST";
	/** The whole address, query string included. */
	url: string;
	/** Form fields in the order they are sent. Only for POST. */
	form?: ReadonlyArray<readonly [string, string]>;
}

export interface ApiResponse {
	status: number;
	body: string;
}

/** Sends one request. Rejects when the network fails or the signal aborts. */
export type Transport = (
	request: ApiRequest,
	signal: AbortSignal,
) => Promise<ApiResponse>;

export const fetchTransport: Transport = async (request, signal) => {
	const init: RequestInit = { method: request.method, signal };
	if (request.form) {
		const body = new URLSearchParams();
		for (const [name, value] of request.form) body.append(name, value);
		init.body = body;
	}
	const response = await fetch(request.url, init);
	return { status: response.status, body: await response.text() };
};
