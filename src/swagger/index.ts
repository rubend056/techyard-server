import { swagger_page } from "./page";

export const ends: (Endpoint | string)[] = [];

type Endpoint = {
	path?: string;
	method?: string;
	link?: string;
	comment?: string;
	input?;
	output?;
	hide?: boolean;
	id?: string;
};

/** 
 * const w = swagger(app)
 * 
 * w(app.get)('/hello', (req,res)=>res.send("Hello"))
 */
const swagger = (app) => {
	const w = <T extends (...args:any[])=>any>(fn: T, options?: Endpoint) => {
		let method = '_U_';
		switch (fn) {
			case app.get:
				method = 'GET';
				break;
			case app.put:
				method = 'PUT';
				break;
			case app.post:
				method = 'POST';
				break;
			case app.all:
				method = 'ALL';
				break;
		}
		return ((path: string, f) => {
			const e: Endpoint = { method, path, ...options };
			ends.push(e);
			return fn.apply(app, [path, f]);
		}) as T;
	};
	w(app.get, { comment: 'This page', hide:true})('/swagger', swagger_page);
	return w;
}
export default swagger;