import {
  Bold,
  Heading2,
  Link,
  List,
  Paperclip,
  Quote,
  Trash2,
} from 'lucide-react'
import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

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

  return (
    <div className="mr-editor">
      <label className="delivery-field">
        <span>MR 标题</span>
        <input
          aria-label="MR 标题"
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="例如：提交 Dragon T2 BOM 交付包"
          value={title}
        />
      </label>
      <div className="mr-editor__tabs" role="tablist">
        <button
          aria-selected={tab === 'write'}
          onClick={() => setTab('write')}
          role="tab"
          type="button"
        >
          编辑
        </button>
        <button
          aria-selected={tab === 'preview'}
          onClick={() => setTab('preview')}
          role="tab"
          type="button"
        >
          预览
        </button>
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
          <label className="delivery-field">
            <span>MR 说明</span>
            <textarea
              aria-label="MR 说明"
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="说明本次改动、交付范围和需要审核的重点"
              ref={textarea}
              rows={8}
              value={description}
            />
          </label>
        </>
      ) : (
        <div className="mr-editor__preview">
          {description.trim() ? (
            <ReactMarkdown>{description}</ReactMarkdown>
          ) : (
            <span>还没有 MR 说明</span>
          )}
        </div>
      )}
      <div className="mr-editor__resources">
        <div>
          <strong>飞书云文档</strong>
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
                placeholder="https://tinyphoton.feishu.cn/docx/..."
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
          <strong>PDF / 图片附件</strong>
          <label className="attachment-picker">
            <Paperclip aria-hidden="true" size={16} />
            选择附件
            <input
              accept=".pdf,image/png,image/jpeg,image/webp"
              aria-label="选择 MR 附件"
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
          {attachments.map((file, index) => (
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
