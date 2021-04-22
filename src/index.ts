import * as pj from 'projen';

export interface GuTsLambdaOptions extends pj.TypeScriptProjectOptions {
  readonly stacks: string[];
  readonly regions?: string[];
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
        stacks: options.stacks,
        regions: options.regions ?? ['eu-west-hackday'],
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
  }
}
