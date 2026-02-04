import { useState } from 'react'
import { uploadScreenshot } from '../exportUtils'

export function useScreenshots(projectName) {
  const [mobileScreenshots, setMobileScreenshots] = useState([])
  const [desktopScreenshots, setDesktopScreenshots] = useState([])
  const [previewImg, setPreviewImg] = useState(null)

  const totalCount = mobileScreenshots.length + desktopScreenshots.length

  const getAllScreenshots = () => [
    ...mobileScreenshots.map((s) => ({ ...s, device: 'mobile' })),
    ...desktopScreenshots.map((s) => ({ ...s, device: 'desktop' })),
  ]

  const handleUpload = async (e, device) => {
    const setter = device === 'mobile' ? setMobileScreenshots : setDesktopScreenshots
    const files = Array.from(e.target.files)
    e.target.value = ''

    for (const file of files) {
      try {
        const result = await uploadScreenshot(projectName, file)
        const label = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
        setter((prev) => [...prev, { name: result.filename, url: result.url, label }])
      } catch {
        // Fallback to base64 if upload fails
        const reader = new FileReader()
        reader.onload = (ev) => {
          const label = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
          setter((prev) => [...prev, { name: file.name, url: ev.target.result, label }])
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const removeScreenshot = (index, device) => {
    const setter = device === 'mobile' ? setMobileScreenshots : setDesktopScreenshots
    setter((prev) => prev.filter((_, i) => i !== index))
  }

  const updateLabel = (index, label, device) => {
    const setter = device === 'mobile' ? setMobileScreenshots : setDesktopScreenshots
    setter((prev) => prev.map((s, i) => (i === index ? { ...s, label } : s)))
  }

  const moveScreenshot = (from, to, device) => {
    const list = device === 'mobile' ? mobileScreenshots : desktopScreenshots
    const setter = device === 'mobile' ? setMobileScreenshots : setDesktopScreenshots

    if (to < 0 || to >= list.length) return
    setter((prev) => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  const setScreenshots = (mobile, desktop) => {
    setMobileScreenshots(mobile || [])
    setDesktopScreenshots(desktop || [])
  }

  const clearScreenshots = () => {
    setMobileScreenshots([])
    setDesktopScreenshots([])
  }

  return {
    mobileScreenshots,
    desktopScreenshots,
    setMobileScreenshots,
    setDesktopScreenshots,
    previewImg,
    setPreviewImg,
    totalCount,
    getAllScreenshots,
    handleUpload,
    removeScreenshot,
    updateLabel,
    moveScreenshot,
    setScreenshots,
    clearScreenshots,
  }
}
