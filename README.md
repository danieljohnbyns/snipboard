# @danieljohnbyns/snipboard

Upload images to snipboard.io from JavaScript/TypeScript.

This package is an unofficial library and is not affiliated with or endorsed by snipboard.io.

## What it does

- Takes a File object
- Uploads it to snipboard.io
- Returns the final public image URL

## Installation

```bash
npm install @danieljohnbyns/snipboard
```

## Usage

```ts
import upload from '@danieljohnbyns/snipboard';

const input = document.querySelector('input[type="file"]') as HTMLInputElement;

if (input.files?.[0]) {
	const url = await upload(input.files[0]);
	console.log(url);
}
```

## Notes

- This library depends on snipboard.io behavior and endpoints, which may change.
- Use responsibly and respect snipboard.io terms of service.