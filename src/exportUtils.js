import jsPDF from 'jspdf'

// ── Server-based file saving ──

async function saveToServer(projectName, filename, content) {
  const folder = (projectName || 'project').replace(/\s+/g, '-').toLowerCase()
  await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, filename, content }),
  })
}

export async function uploadScreenshot(projectName, file) {
  const folder = (projectName || 'project').replace(/\s+/g, '-').toLowerCase()
  const formData = new FormData()
  formData.append('folder', folder)
  formData.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

// ── Scan & load projects ──

export async function fetchProjects() {
  const res = await fetch('/api/projects')
  return res.json()
}

export async function fetchProjectFile(folderName, fileName) {
  const res = await fetch(`/api/project-file?folder=${encodeURIComponent(folderName)}&file=${encodeURIComponent(fileName)}`)
  if (!res.ok) throw new Error('Failed to load project')
  const data = await res.json()
  if (!data.messages || !data.mobileScreenshots || !data.desktopScreenshots) {
    throw new Error('Invalid project file')
  }
  return data
}

// ── JSON project save/load ──

export async function exportProjectJSON(projectState) {
  const data = { ...projectState, version: 1, savedAt: new Date().toISOString() }
  const name = (projectState.name || 'project').replace(/\s+/g, '-').toLowerCase()
  const filename = `${name}-${new Date().toISOString().slice(0, 10)}.json`
  await saveToServer(projectState.name, filename, JSON.stringify(data, null, 2))
}

export function importProjectJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.messages || !data.mobileScreenshots || !data.desktopScreenshots) {
          reject(new Error('Invalid project file: missing required fields'))
          return
        }
        resolve(data)
      } catch {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// ── CSV export ──

function escapeCSV(val) {
  const str = String(val ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function exportTestCasesCSV(testCases, projectName) {
  const headers = ['ID', 'Name', 'Device', 'Type', 'Priority', 'Preconditions', 'Steps', 'Expected Result']
  const rows = testCases.map((tc) => [
    tc.id,
    tc.name,
    tc.device || '',
    tc.type || '',
    tc.priority || '',
    tc.preconditions || '',
    (tc.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n'),
    tc.expected || '',
  ])

  const csv = [headers, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\n')
  const name = (projectName || 'test-cases').replace(/\s+/g, '-').toLowerCase()
  await saveToServer(projectName, `${name}-test-cases.csv`, csv)
}

// ── PDF export ──

export async function exportTestCasesPDF(testCases, projectName) {
  const doc = new jsPDF()
  const margin = 20
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2
  let y = margin

  const checkPage = (needed) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
  }

  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text(projectName || 'Test Cases Report', margin, y)
  y += 8
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Generated: ${new Date().toLocaleDateString()}  |  ${testCases.length} test case(s)`, margin, y)
  y += 12

  testCases.forEach((tc) => {
    checkPage(50)

    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text(`${tc.id}  ${tc.name}`, margin, y)
    y += 5

    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    const badges = [tc.device, tc.type, tc.priority].filter(Boolean).join('  |  ')
    doc.setTextColor(100)
    doc.text(badges, margin, y)
    doc.setTextColor(0)
    y += 6

    if (tc.preconditions) {
      doc.setFont(undefined, 'bold')
      doc.text('Preconditions:', margin, y)
      doc.setFont(undefined, 'normal')
      const lines = doc.splitTextToSize(tc.preconditions, pageWidth)
      y += 4
      lines.forEach((line) => {
        checkPage(5)
        doc.text(line, margin + 2, y)
        y += 4
      })
      y += 2
    }

    if (tc.steps?.length) {
      doc.setFont(undefined, 'bold')
      doc.text('Steps:', margin, y)
      doc.setFont(undefined, 'normal')
      y += 4
      tc.steps.forEach((step, i) => {
        const stepLines = doc.splitTextToSize(`${i + 1}. ${step}`, pageWidth - 4)
        stepLines.forEach((line) => {
          checkPage(5)
          doc.text(line, margin + 4, y)
          y += 4
        })
      })
      y += 2
    }

    if (tc.expected) {
      checkPage(10)
      doc.setFont(undefined, 'bold')
      doc.text('Expected Result:', margin, y)
      doc.setFont(undefined, 'normal')
      y += 4
      const lines = doc.splitTextToSize(tc.expected, pageWidth)
      lines.forEach((line) => {
        checkPage(5)
        doc.text(line, margin + 2, y)
        y += 4
      })
    }

    y += 8
    checkPage(4)
    doc.setDrawColor(200)
    doc.line(margin, y, margin + pageWidth, y)
    y += 6
  })

  const name = (projectName || 'test-cases').replace(/\s+/g, '-').toLowerCase()
  // Trigger browser download
  doc.save(`${name}-test-cases.pdf`)
}
