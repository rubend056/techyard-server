import * as fs from 'fs';
const getFile = (fname:string) => {
	return fs.existsSync(fname) ? fs.readFileSync(fname).toString() : undefined;
}
const getFileJSON = <T=any>(fname:string) => {const f=getFile(fname);return f ? JSON.parse(f) as T:undefined}
const setFileJSON = (fname:string,v:any,pretty?:boolean) => fs.writeFileSync(fname, JSON.stringify(v, undefined, pretty?2:undefined))
/**
 * Runs function to populate file if it doesn't exist, returns file JSON if it does exist.
 * @param fname File Name
 * @param func Function that returns value to be used
 * @returns T
 */
export const fileMemoSync = <T>(fname:string,func: () => T)=>{
	const callFunc = () => {const v = func(); setFileJSON(fname,v); return v;}
	const f = getFileJSON(fname);
	if(!f)return callFunc();
	return f;
}
export const fileData = <T>(fname:string,initial:T,pretty?:boolean):[T,(v:T)=>void] => {
	let v = getFileJSON(fname) ?? initial;
	const setV = (_v:T) => {v=_v;setFileJSON(fname,v,pretty);}
	return [v,setV]
}
export const fileMemo = async <T>(fname:string,func: () => Promise<T>)=>{
	const f = getFileJSON(fname);
	if(!f){const v = await func(); setFileJSON(fname,v); return v;};
	return f;
}
export const fileMemoExpires = async <T>(fname:string,func: () => Promise<T>,expMill:number)=>{
	const callFunc = async () => {const v = await func(); setFileJSON(fname,{exp:Date.now(),data:v}); return v;}
	const f = getFileJSON<{exp:number,data:T}>(fname);
	if(!f)return await callFunc();
	if(Date.now() - (f?.exp ?? 0) > expMill)return await callFunc();
	return f.data;
}

export const jwtParse = (token) => {
  try {
    if (!token) throw Error("Token false");
    return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  } catch (e) {
    return undefined;
  }
};

export const id_gen = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

/** The server refuses to brew coffee because it is, permanently, a teapot. */
export const teapot = (res) => res.sendStatus(418);

// ! Setting foreign cookies did not work due to browser security rules
// import _getCookies from './puppeteer/cookies';
// import {Protocol} from 'puppeteer';

// var cookies:Protocol.Network.Cookie[] = [];
// const getCookies = () => {
// 	_getCookies().then(c => {cookies=c; console.log("Cookies successfully set")}).catch(e => console.log("Cookies failed", e))
// };
// getCookies();
// setInterval(getCookies, 1000 * 60 /** SECS */ * 60 /** MINS */ * 24 /** HOURS */)