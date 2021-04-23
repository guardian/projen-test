import * as pj from 'projen';

export interface GuTsLambdaOptions extends pj.TypeScriptProjectOptions {
  readonly stack: string;
  readonly region?: string;
  readonly runtime?: string;
}

export class GuTsLambda extends pj.TypeScriptAppProject {
  constructor(options: GuTsLambdaOptions) {
    super({
      authorName: 'The Guardian',
      authorEmail: 'devx@theguardian.com',
      authorOrganization: true,
      copyrightPeriod: '2021',
      license: 'Apache-2.0',
      licensed: true,
      stability: 'experimental',
      docgen: true,
      typescriptVersion: '4.2.0',
      tsconfig: {
        compilerOptions: {
          esModuleInterop: true,
        },
      },
      jestOptions: {
        typescriptConfig: {
          compilerOptions: {
            esModuleInterop: true,
          },
        },
      },
      codeCov: true,
      ...options,
    });

    new pj.YamlFile(this, 'riff-raff.yaml', {
      obj: {
        stacks: [options.stack],
        regions: [options.region ?? 'eu-west-1'],
      },
      committed: true,
    });

    new pj.JsonFile(this, 'cdk/cdk.json', {
      committed: true,
      obj: {
        app: 'npx ts-node bin/cdk.ts',
        profile: 'does-not-exist',
        context: {
          '@aws-cdk/core:enableStackNameDuplicates': 'true',
          'aws-cdk:enableDiffNoFail': 'true',
          '@aws-cdk/core:stackRelativeExports': 'true',
        },
      },
    });

    new pj.JsonFile(this, 'cdk/tsconfig.json', {
      committed: true,
      obj: {
        'ts-node': {
          compilerOptions: {
            module: 'CommonJS',
          },
        },
        'compilerOptions': {
          target: 'ES2020',
          module: 'ES2020',
          moduleResolution: 'node',
          lib: ['ES2020'],
          declaration: true,
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          esModuleInterop: true,
          noImplicitThis: true,
          alwaysStrict: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          noImplicitReturns: true,
          noFallthroughCasesInSwitch: false,
          inlineSourceMap: true,
          inlineSources: true,
          experimentalDecorators: true,
          strictPropertyInitialization: false,
          typeRoots: ['./node_modules/@types'],
          outDir: 'dist',
        },
        'include': ['lib/**/*', 'bin/**/*'],
        'exclude': [
          'node_modules',
          'cdk.out',
          'lib/**/*.test.ts',
          'lib/**/__snapshots__/**',
        ],
      },
    });

    new pj.JsonFile(this, 'cdk/package.json', {
      committed: true,
      obj: {
        name: 'cdk',
        version: '0.1.0',
        bin: {
          cdk: 'bin/cdk.js',
        },
        scripts: {
          'build': 'tsc --noEmit',
          'watch': 'tsc -w',
          'test': 'jest --runInBand --detectOpenHandles',
          'test:dev': 'jest --runInBand --detectOpenHandles --watch',
          'format': 'prettier --write "{lib,bin}/**/*.ts"',
          'cdk': 'cdk',
          'lint': 'eslint lib/** bin/** --ext .ts --no-error-on-unmatched-pattern',
          'generate': 'cdk synth --path-metadata false --version-reporting false',
        },
        devDependencies: {
          '@aws-cdk/assert': '1.98.0',
          '@guardian/eslint-config-typescript': '^0.5.0',
          '@types/jest': '^26.0.22',
          '@types/node': '14.14.41',
          '@typescript-eslint/eslint-plugin': '^4.22.0',
          '@typescript-eslint/parser': '^4.22.0',
          'aws-cdk': '1.98.0',
          'eslint': '^7.24.0',
          'eslint-config-prettier': '^8.2.0',
          'eslint-plugin-eslint-comments': '^3.2.0',
          'eslint-plugin-import': '^2.22.1',
          'eslint-plugin-prettier': '^3.4.0',
          'jest': '^26.6.3',
          'prettier': '^2.2.0',
          'ts-jest': '^26.5.5',
          'ts-node': '^9.0.0',
          'typescript': '~4.2.4',
        },
        dependencies: {
          '@aws-cdk/core': '1.98.0',
          '@guardian/cdk': '12.0.0',
          'source-map-support': '^0.5.16',
        },
      },
    });

    const { stack, name, runtime } = options;

    new pj.TextFile(this, 'cdk/bin/cdk.ts', {
      lines: `#!/usr/bin/env node
import "source-map-support/register";
import { App } from "@aws-cdk/core";
import {GuStack} from "@guardian/cdk/lib/constructs/core";
import {GuApiLambda} from "@guardian/cdk/lib/patterns/api-lambda";
import {Runtime} from "@aws-cdk/aws-lambda";

const app = new App();

const stack = new GuStack(app, "${stack}-${name}", {
    stack: "${stack}",
});

const api = new GuApiLambda(stack, "${stack}-${name}-api", {
    fileName: "${name}.zip",
    handler: "index.handler",
    runtime: new Runtime("${ runtime ?? 'NODEJS_14_X'}"),
    monitoringConfiguration: {noMonitoring: true},
    app: "${name}",
    apis: [{
        id: "api"
    }],
});
      `.split('\n'),
    });

    new pj.TextFile(this, 'cdk/script/ci', {
      executable: true,
      lines: `#!/usr/bin/env bash
set -e

DIR=$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )
ROOT_DIR=$DIR/../..

cd $ROOT_DIR/cdk

npm install -g yarn

yarn install --frozen-lockfile
yarn build
yarn generate`.split('\n'),
    });

    const ciWorkflow = this.github?.addWorkflow('CI');

    ciWorkflow?.on({
      pull_request: { },
      workflow_dispatch: { },
    });

    ciWorkflow?.addJobs({
      CI: {
        'runs-on': 'ubuntu-latest',
        'steps': [
          { uses: 'actions/checkout@v2' },
          { uses: 'actions/setup-node@v2.1.5', with: { 'node-version': '14.15.5' } },
          { run: './cdk/script/ci' },
        ],
      },
    });
  }
}
