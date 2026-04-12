import { customAlphabet } from 'nanoid'
import { z } from 'zod'

const { slugRegex } = useAppConfig()

const slugDefaultLength = +useRuntimeConfig().public.slugDefaultLength

// 生成唯一ID的函数
export const nanoid = (length: number = slugDefaultLength) => customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', length)

// 链接验证模式
export const LinkSchema = z.object({
  id: z.string().trim().max(26).default(nanoid(10)), // 链接唯一ID
  url: z.string().trim().url().max(2048), // 目标URL
  slug: z.string().trim().max(2048).regex(new RegExp(slugRegex)).default(nanoid()), // 短链接slug
  comment: z.string().trim().max(2048).optional(), // 注释
  createdAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)), // 创建时间
  updatedAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)), // 更新时间
  expiration: z.union([
  z.number().int().safe().refine(
    exp => exp > Math.floor(Date.now() / 1000),
    { message: '过期时间必须大于当前时间', path: ['expiration'] }
  ),
  z.string().refine(
    exp => {
      const num = Number(exp);
      return !isNaN(num) && Number.isInteger(num) && num > Math.floor(Date.now() / 1000);
    },
    { message: '过期时间必须为有效整数且大于当前时间', path: ['expiration'] }
  )
]).optional(),
  title: z.string().trim().max(256).optional(), // 链接预览标题
  description: z.string().trim().max(2048).optional(), // 链接预览描述
  image: z.string().trim().max(128).optional(), // 链接预览图片
  apple: z.string().trim().url().max(2048).optional(), // Apple App Store重定向URL
  google: z.string().trim().url().max(2048).optional(), // Google Play Store重定向URL
  cloaking: z.boolean().optional(), // 启用链接伪装
  redirectWithQuery: z.boolean().optional(), // 附加查询参数到目标URL
  password: z.string().trim().min(1).max(128).optional(), // 链接密码保护
  unsafe: z.boolean().optional(), // 标记为不安全链接
})

// 链接类型
export type Link = z.infer<typeof LinkSchema>

// 导出数据接口
export interface ExportData {
  version: string // 版本
  exportedAt: string // 导出时间
  count: number // 链接数量
  links: Link[] // 链接列表
  cursor?: string // 游标（用于分页）
  list_complete: boolean // 列表是否完整
}
