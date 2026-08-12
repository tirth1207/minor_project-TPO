/**
 * Light wrapper around NVIDIA NIM chat completions endpoint.
 * All calls are made from server‑side code only – the API key never reaches the client.
 */
export async function callNvidiaChat(model: string, messages: { role: string; content: string }[]): Promise<any> {
  const endpoint = process.env.NVIDIA_NIM_ENDPOINT || 'https://integrate.api.nvidia.com/v1/chat/completions'
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) {
    console.error('NVIDIA_API_KEY not configured')
    throw new Error('AI service unavailable')
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, stream: false, messages }),
  })
  if (!response.ok) {
    const txt = await response.text()
    console.error('NVIDIA API error', response.status, txt)
    throw new Error('AI service error')
  }
  const data = await response.json()
  return data
}
