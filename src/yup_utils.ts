

type Issue = {
	path: string;
	message: string;
};

type MyError = Issue[] | undefined;

const splitName = (name: string) => {
	return name
		.replace(/\[/g, '.[')
		.split('.')
		.filter((v) => v);
};
const normalizeName = (name: string) => splitName(name).join('.');

export const yup_validate = (schema:any, value:any, options?: { stripUnknown?: boolean }) => {
	let errors: MyError;
	if (!schema) return [ value, errors ];

	try {
		schema.validateSync(value, { abortEarly: false, stripUnknown: !!options?.stripUnknown });
	} catch (_error) {
		errors = [];
		const e: any = _error; //as y.ValidationError;
		value = e.value;
		const addError = (
			err //: y.ValidationError
		) => {
			if (!err) return;
			if (err.message) {
				let path = err.path || '';
				let message = err.message.replace(path, '').trim();
				if (message) message = message[0].toUpperCase() + message.substr(1);
				errors?.push({
					path: path && normalizeName(path),
					message: message,
				});
			}
			if (!err?.inner?.length) return;
			err.inner.forEach((ve) => addError(ve));
		};
		addError(e);
	}
	
	return [value, errors]
};
