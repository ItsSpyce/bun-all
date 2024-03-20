import { spawn } from 'bun';
const parser = require('yargs-parser');

type Script =
  | string
  | {
      [key: string]: Script;
    };

export function flattenScripts(
  scripts: Record<string, Script>
): [string, string][] {
  const result = new Array<[string, string]>();
  for (const [name, script] of Object.entries(scripts)) {
    if (typeof script === 'string') {
      result.push([name, script]);
    } else if (typeof script === 'object') {
      result.push(
        ...flattenScripts(script).map(
          ([n, s]) => [`${name}:${n}`, s] as [string, string]
        )
      );
    }
  }
  return result;
}

export function getScriptsToRun(
  name: string,
  scriptJson: Record<string, Script>
): [string, string][] {
  if (scriptJson[name] != null) {
    if (typeof scriptJson[name] === 'string') {
      return [[name, scriptJson[name] as string]];
    } else {
      return flattenScripts(scriptJson[name] as any);
    }
  }

  const flattenedScripts = flattenScripts(scriptJson);
  const glob = new Bun.Glob(name);

  return flattenedScripts.filter(([name]) => glob.match(name)) as [
    string,
    string
  ][];
}

function execScript(cmd: string) {
  const { _ } = parser(cmd);
  const proc = spawn(_, {
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  return proc.exited;
}

export async function run(scripts: any, argv: string[]) {
  const { _: commands, parallel, p } = parser(argv);
  const runInSerial = !parallel && !p;
  if (runInSerial) {
    for (const command of commands) {
      if (command == null) {
        throw new Error(
          'No command provided. Ensure commands go before the options'
        );
      }
      const scriptsToRun = getScriptsToRun(command, scripts);
      for (const [_, cmd] of scriptsToRun) {
        await execScript(cmd);
      }
    }
  } else {
    await Promise.allSettled(
      commands.map(async (command: string) => {
        await Promise.allSettled(
          getScriptsToRun(command, scripts).map(([_, cmd]) => execScript(cmd))
        );
      })
    );
  }
}
