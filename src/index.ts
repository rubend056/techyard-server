import cookieParser from 'cookie-parser';
import express, { IRouterMatcher } from 'express';
import cors from 'cors';
import fs from 'fs';
import http from 'http';
import swagger from './swagger';
import { cloneDeep, pick } from 'lodash';
import { fileData, id_gen } from './utils';
import { Note, NotePost, NotePut } from './types/Notes';
import {noteModifyAllowed, schema_note} from './schemas/Notes';
import { yup_validate } from './yup_utils';

var app = express();
//#region Express Extensions
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
app.use(cors());
app.use(cookieParser() as any);
app.set('trust proxy', true);
//#endregion
const w = swagger(app);
//#region Response Logger
app.use((req, res, next) => {
	console.log(`Incoming request for ${req.path}, from ${req.ip}`);
	var send = res.send;
	//@ts-ignore
	res.send = function (v) {
		console.log(`Answering with `, typeof v === 'string' ? v.substring(0, 100) + (v.length > 100 ? '\n...' : '') : v);
		//@ts-ignore
		send.apply(res, arguments);
	};
	next();
});
//#endregion
//#region GET /time
/** Time ping, for reloading */
const time = new Date();
w(app.get, {
	comment: 'Last server compile time',
	output: { time: 'milliseconds since epoch' },
})('/time', (req, res) => res.send({ time: time.getTime() }));
//#endregion
//#region Definitions
const types_dir = './src/types/';
w(app.get, {
	comment: 'Endpoint Definitions',
	output: '{[k:string]: string} Key is filename, Value is file contents',
})('/definitions', (req, res) =>
	res.send(
		fs
			.readdirSync(types_dir)
			.map((fname) => {
				const content = fs.readFileSync(types_dir + fname).toString();
				return Object.fromEntries([[fname, content]]);
			})
			.reduce((a, v) => Object.assign(a, v), {} as any)
	)
);
//#endregion
//#region GET /
w(app.get, { hide: true })('/', (req, res) => {
	res.redirect('/swagger');
});
//#endregion
//#region GET /pages/:page
w(app.get, { link: '/pages/index.html', comment: 'A static html page' })('/pages/:page', (req, res) => {
	res.send(fs.readFileSync(`./pages/${req.params.page}`).toString());
});
//#endregion
//#region GET Server Management
w(app.get, { comment: 'Where actions on webserver are controlled' })('/de/manage', (req, res) => {
	switch (req.query?.action) {
		case 'reload_applications':
			res.send('Hello back!');
			break;
		default:
			if (typeof req.query?.action !== 'undefined') return res.status(400).send('Action not supported');
			return res.send(`
			<script>
				const t = (e) => {
					e.target.disabled = true;
					const le = document.getElementById("loading");
					const re = document.getElementById("response");
					
					le.style.display = '';
					fetch('/de/manage?action='+e.target.id)
					.then(r=>{if(!r.ok)throw r.statusText;return r.text()})
					.then(r=>{
						re.classList.remove("error");
						re.innerHTML = r;
					})
					.catch((e) => {re.classList.add("error");re.innerHTML = e;})
					.finally(()=>{e.target.disabled=false;le.style.display = 'none';})
				}
			</script>
			<style>
				.counter-border{
					position: absolute;
					top:0;right:0;width:40px;height:40px;margin:10px;
					border-radius: 999px;
					border: 2px dashed rgba(0,0,0,.5);
					animation: rotate 20s linear infinite, appear 1s forwards;
				}
				@keyframes rotate{
					from{transform: rotate(0deg);}
					to{transform: rotate(360deg);}
				}
				@keyframes appear{
					from{opacity: 0;}
					to{opacity: 1;}
				}
				
				.response{
					color:blue;
				}
				.response.error{
					color: red;
				}
			</style>
			<h1>Settings</h1>
			<div class="counter-border" style="display:none" id="loading"></div>
			
			<h2>Action Response</h2>
			<div id="response" class="response"></div>
			
			<h2>Actions</h2>
			<button id="hello" onclick="t(event)">Hello</button>
			
			`);
	}
});
//#endregion

fs.mkdirSync('./data', {recursive:true});
const [notes, setNotes] = fileData<Note[]>('./data/notes.json', []);

// const get_verison = (v:Note[]) => {
// 	const byIds = [];
// 	v.forEach(n => {;byIds.find()})
// }
const notes_c = {
	get: (id?: string) => (id ? notes.find((_n) => _n.id === id) : notes),
	put: (id:string, n: NotePut) => {
		n = cloneDeep(n);
		const i = notes.findIndex((_n) => _n.id === id);
		if (i >= 0) notes[i] = {...notes[i],...pick(n, noteModifyAllowed)};
		else throw "Couldn't find note id " + id;
		setNotes(notes);
	},
	post: (n: NotePost) => {
		n = cloneDeep(n);
		const note: Note = { name:'', ...pick(n, noteModifyAllowed), id: id_gen(), created: Date.now()};
		notes.push(note);
		setNotes(notes);
	},
};
//#region ------------------- ENDPOINTS -----------------------
w(app.get)('/notes/:id?', (req, res) => res.send(notes_c.get(req.params.id)));
w(app.put)('/notes/:id', (req, res) => {
	if(!req.body)return res.send("No body");
	const [n,errors] = yup_validate(schema_note, req.body, {stripUnknown:true});
	if(!errors?.length){notes_c.put(req.params.id, n);return res.sendStatus(200)}
	else return res.status(400).send(errors);
});
w(app.post)('/notes', (req, res) => {
	if(!req.body)return res.send("No body");
	const [n,errors] = yup_validate(schema_note, req.body, {stripUnknown:true});
	if(!errors?.length){notes_c.post(n);return res.sendStatus(200)}
	else return res.status(400).send(errors);
});
//#endregion

//#region Serve the app
const http_port = 9080;
// ,https_port = 9443
// Create an HTTP service.
http.createServer(app).listen(http_port, 'localhost', () => console.log(`App listening on port ${http_port}`));
// Create an HTTPS service identical to the HTTP service.
// var https_options = {
//   key: fs.readFileSync(
//     // "./data/final_final/dls-innovation.com.key"
//     "./certs/anty.dev/cert.key"
//   ),
//   cert: fs.readFileSync(
//     // "./data/final_final/dls-innovation.com.pem"
//     "./certs/anty.dev/cert.crt"
//   ),
// };
// https
//   .createServer({}, app)
//   .listen(https_port, () => console.log(`App listening on port ${https_port}`));
//#endregion
