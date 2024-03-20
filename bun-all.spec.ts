import { describe, test, expect, mock, beforeEach, spyOn } from 'bun:test';
import { spawn } from 'bun';
import { flattenScripts, getScriptsToRun, run } from './index.ts';

const mockSpawn = mock(() => {});

describe('Bun-all', () => {
  beforeEach(() => {
    mockSpawn.mockReset();
  });

  test('properly builds a collection of scripts to run', () => {
    const scriptsJson = {
      test: {
        dev: 'dev',
        prod: 'prod',
      },
      foo: 'bar',
    };
    const flattenedScripts = flattenScripts(scriptsJson);
    expect(flattenedScripts).toHaveLength(3);
    expect(flattenedScripts[0]).toEqual(['test:dev', 'dev']);
    expect(flattenedScripts[1]).toEqual(['test:prod', 'prod']);
    expect(flattenedScripts[2]).toEqual(['foo', 'bar']);
  });

  test('excludes scripts that are not strings or objects', () => {
    const scriptsJson: any = {
      test: {
        dev: 'dev',
      },
      foo: 23,
    };
    const toRun = getScriptsToRun('test', scriptsJson);
    expect(toRun).toHaveLength(1);
  });

  test('properly filters scripts to run with asterisks', () => {
    const scriptsJson = {
      test: {
        dev: 'dev',
        prod: 'prod',
      },
      foo: 'bar',
    };
    const toRun = getScriptsToRun('test:*', scriptsJson);
    expect(toRun).toHaveLength(2);
    expect(toRun[0]).toEqual(['test:dev', 'dev']);
    expect(toRun[1]).toEqual(['test:prod', 'prod']);
  });

  test('runs a single script', async () => {
    const scriptsJson = {
      test: {
        dev: 'dev',
        prod: 'prod',
      },
      foo: 'bar',
    };

    await mock.module('bun', () => {
      return {
        spawn: mockSpawn,
      };
    });
    await run(scriptsJson, ['test:dev']);
    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });
});
