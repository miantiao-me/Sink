import { CalendarDate } from '@internationalized/date'
import { describe, expect, it, vi } from 'vitest'
import {
  createLinkFormInitialValues,
  normalizeLinkFormSubmitPayload,
} from '../../app/utils/link-form'
import { LINK_PASSWORD_MASK_PREFIX } from '../../shared/utils/link-password'

vi.mock('#shared/utils/link-password', async () => import('../../shared/utils/link-password'))

describe('link form values', () => {
  it('creates the current defaults for a new link', () => {
    expect(createLinkFormInitialValues({})).toEqual({
      url: '',
      slug: '',
      comment: '',
      tags: [],
      expiration: undefined,
      google: '',
      apple: '',
      title: '',
      description: '',
      image: '',
      cloaking: false,
      redirectWithQuery: false,
      password: '',
      unsafe: false,
      geo: [],
    })
  })

  it('maps stored expiration and geo records into editable values', () => {
    const expiration = Math.floor(new Date(2030, 0, 2, 12).getTime() / 1000)

    const values = createLinkFormInitialValues({
      expiration,
      geo: { us: ' https://us.example.com ', CA: 'https://ca.example.com' },
    })

    expect(values.expiration?.toString()).toBe('2030-01-02')
    expect(values.geo).toEqual([
      { country: 'us', url: ' https://us.example.com ' },
      { country: 'CA', url: 'https://ca.example.com' },
    ])
  })
})

describe('link form submit payload', () => {
  function formValues(overrides: Partial<ReturnType<typeof createLinkFormInitialValues>> = {}) {
    return {
      ...createLinkFormInitialValues({}),
      url: 'https://example.com',
      slug: 'example',
      ...overrides,
    }
  }

  it('preserves an edited masked password by submitting undefined', () => {
    const payload = normalizeLinkFormSubmitPayload(formValues({
      password: `${LINK_PASSWORD_MASK_PREFIX}•••ret`,
    }), true)

    expect(payload.password).toBeUndefined()
  })

  it('submits an explicit replacement password', () => {
    const payload = normalizeLinkFormSubmitPayload(formValues({ password: 'replacement' }), true)

    expect(payload.password).toBe('replacement')
  })

  it('clears an existing password with an empty string', () => {
    const payload = normalizeLinkFormSubmitPayload(formValues({ password: '' }), true)

    expect(payload.password).toBe('')
  })

  it('omits an empty password when creating a link', () => {
    const payload = normalizeLinkFormSubmitPayload(formValues({ password: '' }), false)

    expect(payload.password).toBeUndefined()
  })

  it('normalizes geo rows into the current record representation', () => {
    const payload = normalizeLinkFormSubmitPayload(formValues({
      geo: [
        { country: ' us ', url: ' https://first.example.com ' },
        { country: '', url: 'https://missing-country.example.com' },
        { country: 'ca', url: '   ' },
        { country: 'US', url: 'https://last.example.com' },
      ],
    }), false)

    expect(payload.geo).toEqual({ US: 'https://last.example.com' })
    expect(normalizeLinkFormSubmitPayload(formValues(), false).geo).toBeUndefined()
  })

  it('keeps expiration, optional field, and unsafe submission semantics', () => {
    const expiration = new CalendarDate(2030, 1, 2)
    const createPayload = normalizeLinkFormSubmitPayload(formValues({
      comment: '',
      google: '   ',
      apple: '',
      title: '',
      description: '',
      image: '',
      expiration,
      unsafe: false,
    }), false)
    const expectedExpiration = Math.floor(new Date(2030, 0, 2, 23, 59, 59).getTime() / 1000)

    expect(createPayload).toMatchObject({
      comment: undefined,
      google: '   ',
      apple: undefined,
      title: undefined,
      description: undefined,
      image: undefined,
      expiration: expectedExpiration,
      unsafe: undefined,
    })
    expect(normalizeLinkFormSubmitPayload(formValues({ unsafe: false }), true).unsafe).toBe(false)
    expect(normalizeLinkFormSubmitPayload(formValues(), false).expiration).toBeUndefined()
  })
})
