import { describe, expect, it } from 'vitest'
import { fetch } from './utils'

type JsonObject = Record<string, any>

async function getOpenApiSpec(): Promise<JsonObject> {
  const response = await fetch('/_docs/openapi.json')
  expect(response.status).toBe(200)
  const spec = await response.json() as JsonObject
  expect(spec.openapi).toBe('3.1.0')
  return spec
}

function jsonBodySchema(spec: JsonObject, path: string, method: string) {
  const requestBody = spec.paths?.[path]?.[method]?.requestBody
  expect(requestBody, `${method.toUpperCase()} ${path} requestBody`).toBeTruthy()
  expect(requestBody.required).toBe(true)
  const media = requestBody.content?.['application/json']
  // Regression guard: Nitro's route-meta extractor used to emit {} here.
  expect(media, `${method.toUpperCase()} ${path} application/json`).not.toEqual({})
  return media?.schema
}

describe('/_docs/openapi.json', () => {
  it('injects request body schemas into the link routes', async () => {
    const spec = await getOpenApiSpec()

    expect(spec.components?.schemas?.CreateLink).toBeTruthy()
    expect(spec.components?.schemas?.EditLink).toBeTruthy()
    expect(spec.components?.schemas?.ImportData).toBeTruthy()
    expect(spec.components?.schemas?.ExactUrlSearch).toBeTruthy()

    expect(jsonBodySchema(spec, '/api/link/create', 'post')).toEqual({ $ref: '#/components/schemas/CreateLink' })
    expect(jsonBodySchema(spec, '/api/link/upsert', 'post')).toEqual({ $ref: '#/components/schemas/CreateLink' })
    expect(jsonBodySchema(spec, '/api/link/edit', 'put')).toEqual({ $ref: '#/components/schemas/EditLink' })
    expect(jsonBodySchema(spec, '/api/link/import', 'post')).toEqual({ $ref: '#/components/schemas/ImportData' })
    expect(jsonBodySchema(spec, '/api/link/search', 'post')).toEqual({ $ref: '#/components/schemas/ExactUrlSearch' })
  })

  it('documents CreateLink without write-time generated defaults', async () => {
    const spec = await getOpenApiSpec()
    const createLink = spec.components?.schemas?.CreateLink

    expect(createLink?.required).toEqual(['url'])
    expect(createLink?.properties?.url?.format).toBe('uri')
    expect(createLink?.properties?.proxy?.type).toBe('boolean')
    expect(createLink?.properties?.id).toBeTruthy()
    expect(createLink?.properties?.slug).toBeTruthy()
    expect(createLink?.properties?.createdAt).toBeTruthy()
    expect(createLink?.properties?.updatedAt).toBeTruthy()
    expect(createLink?.properties?.id?.default).toBeUndefined()
    expect(createLink?.properties?.slug?.default).toBeUndefined()
    expect(createLink?.properties?.createdAt?.default).toBeUndefined()
    expect(createLink?.properties?.updatedAt?.default).toBeUndefined()
  })

  it('documents EditLink with a clearable password', async () => {
    const spec = await getOpenApiSpec()
    const password = spec.components?.schemas?.EditLink?.properties?.password

    expect(password?.type).toBe('string')
    // An empty string clears the password, so no minLength may be published.
    expect(password?.minLength).toBeUndefined()
    expect(password?.description).toContain('empty string clears')
  })

  it('documents ImportData with full link items', async () => {
    const spec = await getOpenApiSpec()
    const importData = spec.components?.schemas?.ImportData

    expect(importData?.required).toEqual(expect.arrayContaining(['version', 'links']))
    const items = importData?.properties?.links?.items
    expect(items?.type).toBe('object')
    expect(items?.required).toEqual(expect.arrayContaining(['url', 'slug']))
    expect(items?.properties?.url?.format).toBe('uri')
    expect(items?.properties?.tags?.type).toBe('array')
  })

  it('documents ExactUrlSearch with required url and limit default 20', async () => {
    const spec = await getOpenApiSpec()
    const search = spec.components?.schemas?.ExactUrlSearch

    expect(search?.required).toEqual(['url'])
    expect(search?.properties?.url?.format).toBe('uri')
    expect(search?.properties?.limit?.default).toBe(20)
    expect(search?.properties?.limit?.maximum).toBe(1000)
  })

  it('keeps the bearerAuth security scheme', async () => {
    const spec = await getOpenApiSpec()
    expect(spec.components?.securitySchemes?.bearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      description: 'Use NUXT_SITE_TOKEN as the bearer token',
    })
    expect(spec.paths?.['/api/link/create']?.post?.security).toEqual([{ bearerAuth: [] }])
  })
})
