import { expect, it } from 'vitest'
import { inspectUploadRisks } from './projectRiskService'

it('blocks unsafe upload states', () => {
  const result = inspectUploadRisks({ branch: 'dev/T1', behind: 1 }, { message: 'x', branch: 'dev/T2', changePaths: ['deleted.prt'], confirmedDeletions: [], selectedPackageIds: [] })
  expect(result.map((risk) => risk.code)).toEqual(['server_ahead', 'unexpected_branch'])
})
