import type { Compilable, TableNode } from 'kysely'
import {
  DummyDriver,
  Kysely,
  MysqlAdapter,
  MysqlIntrospector,
  MysqlQueryCompiler,
} from 'kysely'

export interface AnalyticsRow {
  _sample_interval: number
  index1: string
  timestamp: string
  [column: string]: unknown
}

type AnalyticsDatabase = Record<string, AnalyticsRow>

// Keep Analytics Engine identifiers to its conservative bare-identifier subset.
// eslint-disable-next-line regexp/prefer-w, regexp/use-ignore-case
const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/
// Analytics Engine bindings accept hyphenated dataset names, but its SQL parser
// only reads them as double-quoted identifiers.
// eslint-disable-next-line regexp/prefer-w, regexp/use-ignore-case
const datasetPattern = /^[A-Za-z_][A-Za-z0-9_-]*$/

class AnalyticsQueryCompiler extends MysqlQueryCompiler {
  protected override visitTable(node: TableNode): void {
    const { schema, identifier: { name } } = node.table
    if (schema || !datasetPattern.test(name))
      throw new Error(`Invalid Analytics dataset: ${name}`)

    this.append(identifierPattern.test(name) ? name : `"${name}"`)
  }

  protected override getLeftIdentifierWrapper(): string {
    return ''
  }

  protected override getRightIdentifierWrapper(): string {
    return ''
  }

  protected override sanitizeIdentifier(identifier: string): string {
    if (!identifierPattern.test(identifier))
      throw new Error(`Invalid Analytics identifier: ${identifier}`)

    return identifier
  }
}

const coldDb = new Kysely<AnalyticsDatabase>({
  dialect: {
    createAdapter: () => new MysqlAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: db => new MysqlIntrospector(db),
    createQueryCompiler: () => new AnalyticsQueryCompiler(),
  },
})

export function createAnalyticsQuery(dataset: string) {
  if (!datasetPattern.test(dataset))
    throw new Error(`Invalid Analytics dataset: ${dataset}`)

  return coldDb.selectFrom(dataset)
}

export function compileAnalyticsQuery(query: Compilable): string {
  const compiled = query.compile()
  if (compiled.parameters.length !== 0)
    throw new Error('Analytics SQL queries must not contain parameters')

  return compiled.sql
}
