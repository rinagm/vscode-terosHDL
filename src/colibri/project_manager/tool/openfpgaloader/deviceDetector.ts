import { t_board_list, t_loader_boards_result } from '../common';
import { executeCommandWait } from './executor';
import { parseDetectOutput, parseDetectionError, t_openfpgaloader_config } from './utils';

function parseDetectJsonOutput(stdout: string): t_board_list[] {
	const parsed = JSON.parse(stdout) as unknown;
	const rawList = Array.isArray(parsed)
		? parsed
		: (parsed as { devices?: unknown[] })?.devices;

	if (!Array.isArray(rawList)) {
		return [];
	}

	const grouped = new Map<string, Set<string>>();
	for (const item of rawList) {
		const device = item as Record<string, unknown>;
		const family = String(device.family ?? '').trim();
		const model = String(device.model ?? '').trim();
		if (family === '' || model === '') {
			continue;
		}
		if (!grouped.has(family)) {
			grouped.set(family, new Set<string>());
		}
		grouped.get(family)?.add(model);
	}

	return Array.from(grouped.entries()).map(([family, models]) => ({
		family,
		part_list: Array.from(models)
	}));
}

export async function detectDevices(
	config: t_openfpgaloader_config,
	cwd: string
): Promise<t_loader_boards_result> {
	// Try JSON output first (available in some openFPGALoader versions).
	const jsonResult = await executeCommandWait(config, ['--detect', '--json'], cwd);
	if (jsonResult.successful) {
		try {
			const boards = parseDetectJsonOutput(jsonResult.stdout);
			return {
				board_list: boards,
				successful: true,
				msg: boards.length > 0 ? '' : 'No se encontraron dispositivos'
			};
		}
		catch (_error) {
			// Fall back to text parsing below.
		}
	}

	const result = await executeCommandWait(config, ['--detect'], cwd);
	if (!result.successful) {
		return {
			board_list: [],
			successful: false,
			msg: parseDetectionError(result.stderr)
		};
	}

	const boardList = parseDetectOutput(result.stdout);
	return {
		board_list: boardList,
		successful: true,
		msg: boardList.length > 0 ? '' : 'No se encontraron dispositivos'
	};
}

