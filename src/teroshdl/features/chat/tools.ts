import * as vscode from 'vscode';
import { Tasks_manager } from '../tree_views/tasks/manager';
import { e_taskType } from 'colibri/project_manager/tool/common';

interface IRunTaskParameters {}

export class QuartusTaskBase implements vscode.LanguageModelTool<IRunTaskParameters> {
    private taskManager: Tasks_manager;
    private taskType: e_taskType;

    constructor(taskManager: Tasks_manager, taskType: e_taskType) {
        this.taskManager = taskManager;
        this.taskType = taskType;
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IRunTaskParameters>,
        token: vscode.CancellationToken
    ) {
        const result = await this.taskManager.runQuartusTask(this.taskType);
        let message = "Task failed";
        if (result && result.successful) {
            message = "Task completed successfully";
        }
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(message)]);
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IRunTaskParameters>,
        token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: `Running "${this.taskType.toString()}" task`,
        };
    }
}

export class RunClean implements vscode.LanguageModelTool<IRunTaskParameters> {
    private taskManager: Tasks_manager;

    constructor(taskManager: Tasks_manager) {
        this.taskManager = taskManager;
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IRunTaskParameters>,
        token: vscode.CancellationToken
    ) {
        const result = await this.taskManager.clean(true);
        let message = "Project not cleaned";
        if (result && result.successful) {
            message = "Project cleaned";
        }
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(message)]);
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IRunTaskParameters>,
        token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: `Cleaning project`,
        };
    }
}

export class RunRtlAnalyzer extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_RTL_ANALYZER);
    }
}

export class RunCompileDesign extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_COMPILEDESIGN);
    }
}

export class RunAnalysisAndSynthesis extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_ANALYSISSYNTHESIS);
    }
}

export class RunAnalysisAndElaboration extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_ANALYSISELABORATION);
    }
}

export class RunSynthesis extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_SYNTHESIS);
    }
}

export class RunEarlyTimingAnalysis extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_EARLYTIMINGANALYSIS);
    }
}

export class RunFitter extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_FITTER);
    }
}

export class RunFitterImplement extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_FITTERIMPLEMENT);
    }
}

export class RunPlan extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_PLAN);
    }
}

export class RunPlace extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_PLACE);
    }
}

export class RunRoute extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_ROUTE);
    }
}

export class RunFitterFinalize extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_FITTERFINALIZE);
    }
}

export class RunTimingAnalysisSignoff extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_TIMING);
    }
}

export class RunAssembler extends QuartusTaskBase {
    constructor(taskManager: Tasks_manager) {
        super(taskManager, e_taskType.QUARTUS_ASSEMBLER);
    }
}


