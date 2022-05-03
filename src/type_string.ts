// We can't turn Typescript Types into objects
// But we can turn const objects into Typescript Types :)

const types = ["string", "number", "bigint", "boolean", "symbol", "undefined", "object", "function"] as const;
type Type = typeof types[number];
type TypeInfer<T> = 
T extends 'string' ? string :
T extends 'number' ? number :
T extends 'bigint' ? bigint :
T extends 'boolean' ? boolean :
T extends 'symbol' ? symbol :
T extends 'undefined' ? undefined :
T extends 'object' ? object :
T extends 'function' ? Function : never;
type OptionalInfer<O,T> = O extends true ? T | undefined : T;

type TypeDescriptor = {
	type:Type,
	optional?,
}
type InferTypeDescriptor<T extends 
{[k:string]:TypeDescriptor}
// TypeDescriptor[]
> =
{
	[K in keyof T]: OptionalInfer<T[K]['optional'],TypeInfer<T[K]['type']>>
	// [K in T[number]['name']]: OptionalInfer<T[number]['type'],TypeInfer<T[number]['type']>>
}

type TDObject = {[k:string]:TypeDescriptor};

const test = {
	a: {
		type:'number',
		optional: true,
	},
	b: {
		type: 'number'
	}
} as const;

type testT = InferTypeDescriptor<typeof test>