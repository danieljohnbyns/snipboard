const upload = async (file: File): Promise<string> => {
	const setCookieHeader = (pageResponseHeaders: Headers): string | undefined => {
		const getSetCookie = (
			pageResponseHeaders as Headers & { getSetCookie?: () => string[] }
		).getSetCookie;

		const cookies =
			typeof getSetCookie === 'function'
				? getSetCookie.call(pageResponseHeaders)
				: pageResponseHeaders.get('set-cookie')
					? [pageResponseHeaders.get('set-cookie') as string]
					: [];

		if (!cookies.length) return undefined;

		return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
	};

	const mimeTypeForFile = (input: File): string => {
		if (input.type?.trim()) {
			if (input.type.toLowerCase() === 'image/jpg') return 'image/jpeg';
			return input.type;
		};

		const ext = input.name.split('.').pop()?.toLowerCase();
		if (!ext) return 'application/octet-stream';

		const mimeByExt: Record<string, string> = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			webp: 'image/webp'
		};

		return mimeByExt[ext] ?? 'application/octet-stream';
	};

	const browserLikeHeaders = {
		'user-agent':
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
		'accept-language': 'en-US,en;q=0.9'
	};

	const pageResponse = await fetch('https://snipboard.io/', {
		method: 'GET',
		headers: {
			...browserLikeHeaders,
			accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
		}
	});

	if (!pageResponse.ok)
		throw new Error(
			`Failed to load snipboard page: ${pageResponse.status} ${pageResponse.statusText}`
		);

	const html = await pageResponse.text();
	const csrfToken =
		html.match(/csrf_token\s*=\s*'([^']+)'/)?.[1] ??
		html.match(/name=["']csrfmiddlewaretoken["'][^>]*value=["']([^"']+)["']/)?.[1] ??
		html.match(/value=["']([^"']+)["'][^>]*name=["']csrfmiddlewaretoken["']/)?.[1];

	if (!csrfToken) throw new Error('Could not extract CSRF token from snipboard page');

	const cookieHeader = setCookieHeader(pageResponse.headers);

	const prepareBody = new URLSearchParams({
		token: '',
		type: mimeTypeForFile(file),
		csrfmiddlewaretoken: csrfToken
	});

	const prepareForImageUploadResponse = await fetch(
		'https://snipboard.io/api/prepareForImageUpload',
		{
			method: 'POST',
			headers: {
				...browserLikeHeaders,
				accept: '*/*',
				'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'x-requested-with': 'XMLHttpRequest',
				origin: 'https://snipboard.io',
				referer: 'https://snipboard.io/',
				...(cookieHeader ? { cookie: cookieHeader } : {})
			},
			body: prepareBody.toString()
		}
	);

	if (!prepareForImageUploadResponse.ok) {
		const errorText = await prepareForImageUploadResponse.text().catch(() => '');
		throw new Error(
			`prepareForImageUpload failed: ${prepareForImageUploadResponse.status} ${prepareForImageUploadResponse.statusText} ${errorText}`
		);
	};

	type S3Fields = {
		acl: string;
		'Content-Type': string;
		key: string;
		AWSAccessKeyId: string;
		'x-amz-security-token': string;
		policy: string;
		signature: string;
	};

	type PrepareResponse = {
		form?: {
			url: string;
			fields: S3Fields;
		};
		url?: string;
		fields?: S3Fields;
		token: string;
		info: {
			url: string;
			can_edit: boolean;
			hide_ads: boolean;
		};
	};

	const response = (await prepareForImageUploadResponse.json()) as PrepareResponse;

	const uploadTarget =
		response.form ??
		(response.url && response.fields
			? {
				url: response.url,
				fields: response.fields
			}
			: undefined);

	if (!uploadTarget)
		throw new Error(
			`prepareForImageUpload response missing S3 target: ${JSON.stringify(response)}`
		);

	const s3Form = new FormData();
	s3Form.append('acl', uploadTarget.fields.acl);
	s3Form.append('Content-Type', uploadTarget.fields['Content-Type']);
	s3Form.append('key', uploadTarget.fields.key);
	s3Form.append('AWSAccessKeyId', uploadTarget.fields.AWSAccessKeyId);
	s3Form.append('x-amz-security-token', uploadTarget.fields['x-amz-security-token']);
	s3Form.append('policy', uploadTarget.fields.policy);
	s3Form.append('signature', uploadTarget.fields.signature);
	s3Form.append('file', file, file.name);

	const s3Response = await fetch(uploadTarget.url, {
		method: 'POST',
		headers: {
			accept: '*/*'
		},
		body: s3Form
	});

	if (!s3Response.ok) {
		const errorText = await s3Response.text().catch(() => '');
		throw new Error(
			`S3 upload failed: ${s3Response.status} ${s3Response.statusText} ${errorText}`
		);
	};

	if (!response.info?.url)
		throw new Error('prepareForImageUpload response missing final snipboard URL');

	return response.info.url;
};

export default upload;
export { upload };
