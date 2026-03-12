declare module 'mysql-bricks' {
  import type SqlBricks from 'sql-bricks'

  const mysqlBricks: typeof SqlBricks
  export = mysqlBricks
}
