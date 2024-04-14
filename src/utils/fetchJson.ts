export type FetchOptions = RequestInit

const fetchJson = async (url: string, options?: FetchOptions): Promise<any> => {
  if (process.env.VERBOSE) console.log(`fetchJson: ${url}`)
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`Fetch failed with status: ${response.status} ${url}`)
  }
  return await response.json()
}

export default fetchJson
