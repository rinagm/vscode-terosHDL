import { t_board_list } from '../common';

// Temporary local type until config generation adds e_tools_openfpgaloader.
export type t_openfpgaloader_config = {
	installation_path?: string;
};

export function quoteArgs(args: string[]): string {
	return args
		.map((arg) => `'${String(arg).replace(/'/g, `'\\''`)}'`)
		.join(' ');
}

export function parseDetectOutput(stdout: string): t_board_list[] {
	const boardsByFamily = new Map<string, Set<string>>();
	const lines = stdout.split(/\r?\n/);

	let currentFamily = '';
	let currentModel = '';

	const flushCurrent = () => {
		if (currentFamily === '' || currentModel === '') {
			return;
		}
		if (!boardsByFamily.has(currentFamily)) {
			boardsByFamily.set(currentFamily, new Set<string>());
		}
		boardsByFamily.get(currentFamily)?.add(currentModel);
	};

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (line === '') {
			flushCurrent();
			currentFamily = '';
			currentModel = '';
			continue;
		}

		if (/^index\s+\d+:/i.test(line)) {
			flushCurrent();
			currentFamily = '';
			currentModel = '';
			continue;
		}

		const familyMatch = line.match(/^family\s+(.+)$/i);
		if (familyMatch) {
			currentFamily = familyMatch[1].trim();
		}

		const modelMatch = line.match(/^model\s+(.+)$/i);
		if (modelMatch) {
			currentModel = modelMatch[1].trim();
		}

		flushCurrent();
	}

	flushCurrent();

	return Array.from(boardsByFamily.entries()).map(([family, models]) => ({
		family,
		part_list: Array.from(models)
	}));
}

export function parseDetectionError(stderr: string): string {
	const message = (stderr || '').trim();
	const lower = message.toLowerCase();

	const binaryMissing =
		(lower.includes('openfpgaloader') && lower.includes('not found')) ||
		lower.includes('command not found') ||
		lower.includes('not recognized as an internal');
	if (binaryMissing) {
		return 'openFPGALoader no encontrado. Verifique installation_path o instale la herramienta.';
	}

	if (lower.includes('permission denied') || lower.includes('access denied')) {
		return 'Permiso denegado. Configure las reglas udev para su cable JTAG.';
	}

	if (lower.includes('no device') || lower.includes('not found') || lower.includes('no cable')) {
		return 'No se encontraron dispositivos. Compruebe la conexión USB.';
	}

	if (lower.includes('timeout')) {
		return 'Timeout en la detección de dispositivos. Compruebe cable y drivers.';
	}

	if (message === '') {
		return 'No se pudieron detectar dispositivos con openFPGALoader.';
	}

	return message;
}

