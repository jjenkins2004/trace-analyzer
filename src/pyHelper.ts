export async function sendTrace(path: string) {
  try {
    const res = await window.ipcRenderer.invoke('request', path)
    console.log('Python replied:', res)
  } catch (err) {
    console.error('Python error:', err)
  }
}
