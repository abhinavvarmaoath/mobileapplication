import { type Api, type Bases, createApi } from "./endpoints";
import { createSender, type SenderOptions } from "./sender";

export type { Api, Bases } from "./endpoints";
export { ApiError, type ApiFailure } from "./errors";
export type { ApiRequest, ApiResponse, Transport } from "./transport";
export * from "./types";

export type ClientOptions = Bases & SenderOptions;

export function createClient(options: ClientOptions): Api {
	return createApi(createSender(options), options);
}
