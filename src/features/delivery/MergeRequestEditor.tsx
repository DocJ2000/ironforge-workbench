import {
  Bold,
  Heading2,
  Link,
  List,
  Paperclip,
  Quote,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { FieldHelp } from '../account/FieldHelp'
import './delivery.css'

interface MergeRequestEditorProps {
  attachments: File[]
  description: string
  feishuLinks: string[]
  onAttachmentsChange: (files: File[]) => void
  onDescriptionChange: (value: string) => void
  onFeishuLinksChange: (links: string[]) => void
  onTitleChange: (value: string) => void
  title: string
}

const tools = [
  { icon: Heading2, label: '标题', before: '## ', after: '' },
  { icon: Bold, label: '粗体', before: '**', after: '**' },
  { icon: List, label: '列表', before: '- ', after: '' },
  { icon: Quote, label: '引用', before: '> ', after: '' },
  { icon: Link, label: '链接', before: '[', after: '](https://)' },
]

export function inlineImageMarker(fileName: string) {
  return `![${fileName}](ironforge-inline:${encodeURIComponent(fileName)})`
}

export function MergeRequestEditor({
  attachments,
  description,
  feishuLinks,
  onAttachmentsChange,
  onDescriptionChange,
  onFeishuLinksChange,
  onTitleChange,
  title,
}: MergeRequestEditorProps) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const inlineFiles = attachments.filter((file) => description.includes(inlineImageMarker(file.name)))
  const previewSources = useMemo(() => new Map(
    inlineFiles.map((file) => [
      `ironforge-inline:${encodeURIComponent(file.name)}`,
      typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '',
    ]),
  ), [attachments, description])

  useEffect(() => () => {
    previewSources.forEach((source) => {
      if (source && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(source)
    })
  }, [previewSources])

  function insert(before: string, after: string) {
    const element = textarea.current
    const start = element?.selectionStart ?? description.length
    const end = element?.selectionEnd ?? description.length
    const selected = description.slice(start, end)
    const content = selected || '内容'
    onDescriptionChange(
      `${description.slice(0, start)}${before}${content}${after}${description.slice(end)}`,
    )
  }

  function addPastedImages(items: DataTransferItemList) {
    const images = Array.from(items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item, index) => {
        const file = item.getAsFile()
        if (!file) return null
        const extension = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
        return new File(
          [file],
          `粘贴的图片-${Date.now()}-${index + 1}.${extension}`,
          { type: file.type },
        )
      })
      .filter((file): file is File => Boolean(file))

    if (!images.length) return false
    const element = textarea.current
    const start = element?.selectionStart ?? description.length
    const end = element?.selectionEnd ?? description.length
    const prefix = start > 0 && description[start - 1] !== '\n' ? '\n\n' : ''
    const suffix = end < description.length && description[end] !== '\n' ? '\n\n' : ''
    const markers = images.map((file) => inlineImageMarker(file.name)).join('\n\n')
    onDescriptionChange(
      `${description.slice(0, start)}${prefix}${markers}${suffix}${description.slice(end)}`,
    )
    onAttachmentsChange([...attachments, ...images])
    return true
  }

  return (
    <div className="mr-editor">
      <label className="mr-editor__title-field">
        <span className="field-label-row">给管理员看的审核标题
          <FieldHelp label="审核标题"><strong>管理员会先看到这句话。</strong><ol><li>写清楚项目、阶段和交付内容。</li><li>正确示例：“示例项目 T2 全部交付包”。</li><li>不要只写“请审核”“交付”或日期。</li><li>标题只用于说明，不会自动提交。</li></ol></FieldHelp>
        </span>
        <input
          aria-label="本次交付标题"
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="例如：提交示例项目 T2 交付包"
          value={title}
        />
      </label>
      <section className="mr-editor__description">
        <div className="mr-editor__description-heading">
          <span className="field-label-row">还有什么需要告诉管理员（可以不填）
            <FieldHelp label="补充说明"><strong>只有管理员需要特别注意某些内容时才填写。</strong><ol><li>可以说明本次改了哪些零件。</li><li>可以注明需要重点检查的尺寸或风险。</li><li>可以说明哪些旧文件已删除。</li><li>没有额外内容就保持空白。</li></ol></FieldHelp>
          </span>
          <span>支持 Markdown，也可以直接粘贴截图</span>
        </div>
        <div className="mr-editor__shell">
          <div className="mr-editor__tabs" role="tablist">
            <button aria-selected={tab === 'write'} onClick={() => setTab('write')} role="tab" type="button">编辑</button>
            <button aria-selected={tab === 'preview'} onClick={() => setTab('preview')} role="tab" type="button">预览</button>
          </div>
          {tab === 'write' ? (
            <>
          <div className="mr-editor__toolbar">
            {tools.map(({ icon: Icon, label, before, after }) => (
              <button
                aria-label={label}
                key={label}
                onClick={() => insert(before, after)}
                title={label}
                type="button"
              >
                <Icon aria-hidden="true" size={16} />
              </button>
            ))}
          </div>
            <textarea
              className="mr-editor__textarea"
              aria-label="交付补充说明（可选）"
              onChange={(event) => onDescriptionChange(event.target.value)}
              onPaste={(event) => {
                if (addPastedImages(event.clipboardData.items)) event.preventDefault()
              }}
              placeholder="说明本次改动、交付范围和需要审核的重点"
              ref={textarea}
              rows={10}
              value={description}
            />
            </>
          ) : (
            <div className="mr-editor__preview">
              {description.trim() ? (
                <ReactMarkdown components={{
                  img: ({ alt, src }) => (
                    <img alt={alt ?? ''} src={previewSources.get(src ?? '') || src} />
                  ),
                }}>{description}</ReactMarkdown>
              ) : <span>还没有补充说明</span>}
            </div>
          )}
          <div className="mr-editor__footer">粘贴的图片会自动加入下面的“相关附件”，最终随审核单上传。</div>
        </div>
      </section>
      <div className="mr-editor__resources-heading">
        <strong>补充资料</strong>
        <span>这些资料只供管理员审核，不会加入 charge.json 交付包。</span>
      </div>
      <div className="mr-editor__resources">
        <div>
          <strong className="field-label-row">相关飞书文档（可以不填）
            <FieldHelp label="飞书文档链接"><strong>把与本次交付有关的在线文档附给管理员。</strong><ol><li>在浏览器或办公软件中打开需要附上的文档。</li><li>点击右上角“分享”。</li><li>点击“复制链接”。</li><li>回到这里，点击“添加文档链接”并粘贴。</li><li>地址应该以 https:// 开头。</li><li>没有相关文档就不添加。</li></ol></FieldHelp>
          </strong>
          {feishuLinks.map((link, index) => (
            <div className="resource-row" key={`feishu-${index}`}>
              <input
                aria-label={`飞书链接 ${index + 1}`}
                onChange={(event) =>
                  onFeishuLinksChange(
                    feishuLinks.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item,
                    ),
                  )
                }
                placeholder="https://docs.example.com/..."
                value={link}
              />
              <button
                aria-label={`删除飞书链接 ${index + 1}`}
                onClick={() =>
                  onFeishuLinksChange(
                    feishuLinks.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                type="button"
              >
                <Trash2 aria-hidden="true" size={15} />
              </button>
            </div>
          ))}
          <button
            className="button button--quiet"
            onClick={() => onFeishuLinksChange([...feishuLinks, ''])}
            type="button"
          >
            <Link aria-hidden="true" size={15} />
            添加飞书链接
          </button>
        </div>
        <div>
          <strong className="field-label-row">相关 PDF 或图片（可以不填）
            <FieldHelp label="审核附件"><strong>只添加管理员审核时必须查看、但不在交付包里的资料。</strong><ol><li>点击“选择附件”。</li><li>选择 PDF、PNG、JPG 或 WebP 文件。</li><li>可一次选择多个文件。</li><li>单个文件不能超过 20 MB。</li><li>附件会在最后点击“创建审核单”后才上传。</li></ol></FieldHelp>
          </strong>
          <label className="attachment-picker">
            <Paperclip aria-hidden="true" size={16} />
            选择附件
            <input
              accept=".pdf,image/png,image/jpeg,image/webp"
              aria-label="选择审核单附件"
              multiple
              onChange={(event) =>
                onAttachmentsChange([
                  ...attachments,
                  ...Array.from(event.target.files ?? []),
                ])
              }
              type="file"
            />
          </label>
          {attachments.filter((file) => !description.includes(inlineImageMarker(file.name))).map((file, index) => (
            <div className="attachment-row" key={`${file.name}-${index}`}>
              <span>
                {file.name}
                <small>{Math.ceil(file.size / 1024)} KB · 待确认后上传</small>
              </span>
              <button
                aria-label={`移除附件 ${file.name}`}
                onClick={() =>
                  onAttachmentsChange(
                    attachments.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                type="button"
              >
                <Trash2 aria-hidden="true" size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
