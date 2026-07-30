import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { MergeRequestEditor } from './MergeRequestEditor'

function EditorHarness() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('更新结构图纸')
  const [links, setLinks] = useState<string[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  return (
    <MergeRequestEditor
      attachments={attachments}
      description={description}
      feishuLinks={links}
      onAttachmentsChange={setAttachments}
      onDescriptionChange={setDescription}
      onFeishuLinksChange={setLinks}
      onTitleChange={setTitle}
      title={title}
    />
  )
}

describe('MergeRequestEditor', () => {
  it('edits an independent title and previews Markdown', () => {
    render(<EditorHarness />)

    fireEvent.change(screen.getByLabelText('本次交付标题'), {
      target: { value: '提交 Dragon T2 交付包' },
    })
    fireEvent.click(screen.getByRole('button', { name: '粗体' }))
    fireEvent.click(screen.getByRole('tab', { name: '预览' }))

    expect(screen.getByDisplayValue('提交 Dragon T2 交付包')).toBeVisible()
    expect(screen.getByText(/更新结构图纸/)).toBeVisible()
  })

  it('adds Feishu links and queues PDF attachments locally', () => {
    render(<EditorHarness />)

    fireEvent.click(screen.getByRole('button', { name: '添加飞书链接' }))
    fireEvent.change(screen.getByLabelText('飞书链接 1'), {
      target: {
        value: 'https://tinyphoton.feishu.cn/docx/example',
      },
    })
    const pdf = new File(['PDF'], '评审资料.pdf', {
      type: 'application/pdf',
    })
    fireEvent.change(screen.getByLabelText('选择审核单附件'), {
      target: { files: [pdf] },
    })

    expect(
      screen.getByDisplayValue('https://tinyphoton.feishu.cn/docx/example'),
    ).toBeVisible()
    expect(screen.getByText('评审资料.pdf')).toBeVisible()
    expect(screen.getByText(/待确认后上传/)).toBeVisible()
  })

  it('adds pasted images to the attachment list without changing the description', () => {
    render(<EditorHarness />)
    const image = new File(['PNG'], 'image.png', { type: 'image/png' })
    const item = {
      kind: 'file',
      type: 'image/png',
      getAsFile: () => image,
    }

    fireEvent.paste(screen.getByLabelText('交付补充说明（可选）'), {
      clipboardData: { items: [item] },
    })

    expect(screen.getByText(/粘贴的图片-/)).toBeVisible()
    expect(screen.getByDisplayValue('更新结构图纸')).toBeVisible()
  })
})
