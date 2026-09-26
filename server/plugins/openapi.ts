import type { H3Event } from 'h3'
import { z } from 'zod'
import { ImportDataSchema } from '#shared/schemas/import'
import { CreateLinkSchema, EditLinkSchema, ExactUrlSearchSchema } from '#shared/schemas/link'

// Nitro's defineRouteMeta extractor only keeps static literals, so dynamic
// JSON Schemas cannot be declared per route. This plugin generates them from
// the same zod contracts the handlers parse with and injects them into the
// OpenAPI document before it is served.

const SCHEMA_COMPONENTS: Record<string, () => z.core.JSONSchema.JSONSchema> = {
  CreateLink: () => {
    const schema = z.toJSONSchema(CreateLinkSchema, { io: 'input' })
    // These fields default to write-time generated values (nanoid/timestamp);
    // publishing a concrete sample as `default` would be misleading.
    for (const key of ['id', 'slug', 'createdAt', 'updatedAt']) {
      const property = schema.properties?.[key]
      if (typeof property === 'object')
        delete property.default
    }
    return schema
  },
  EditLink: () => z.toJSONSchema(EditLinkSchema, { io: 'input' }),
  ImportData: () => z.toJSONSchema(ImportDataSchema, { io: 'input' }),
  ExactUrlSearch: () => z.toJSONSchema(ExactUrlSearchSchema, { io: 'input' }),
}

const ROUTE_BODY_COMPONENTS: Record<string, Record<string, keyof typeof SCHEMA_COMPONENTS>> = {
  '/api/link/create': { post: 'CreateLink' },
  '/api/link/upsert': { post: 'CreateLink' },
  '/api/link/edit': { put: 'EditLink' },
  '/api/link/import': { post: 'ImportData' },
  '/api/link/search': { post: 'ExactUrlSearch' },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function applyOpenAPISchemas(spec: Record<string, unknown>) {
  const paths = isRecord(spec.paths) ? spec.paths : {}
  const components = isRecord(spec.components) ? spec.components : {}
  const schemas = isRecord(components.schemas) ? components.schemas : {}
  spec.components = components
  components.schemas = schemas

  for (const [name, build] of Object.entries(SCHEMA_COMPONENTS)) {
    schemas[name] = build()
  }

  for (const [route, methods] of Object.entries(ROUTE_BODY_COMPONENTS)) {
    const pathItem = paths[route]
    if (!isRecord(pathItem))
      continue
    for (const [method, component] of Object.entries(methods)) {
      const operation = pathItem[method]
      if (!isRecord(operation))
        continue
      const requestBody = isRecord(operation.requestBody) ? operation.requestBody : {}
      const content = isRecord(requestBody.content) ? requestBody.content : {}
      const json = isRecord(content['application/json']) ? content['application/json'] : {}
      operation.requestBody = requestBody
      requestBody.content = content
      content['application/json'] = json
      json.schema = { $ref: `#/components/schemas/${component}` }
    }
  }
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event: H3Event, response: { body?: unknown }) => {
    const openAPIRoute = useRuntimeConfig(event).nitro?.openAPI?.route
    if (!openAPIRoute || event.path !== openAPIRoute)
      return

    const spec = response.body
    if (!isRecord(spec) || spec.openapi !== '3.1.0' || !isRecord(spec.paths))
      return

    applyOpenAPISchemas(spec)
  })
})
