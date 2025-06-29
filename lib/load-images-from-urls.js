export async function loadImagesFromURLs(imageURLs = []) {
  if (!imageURLs.length || !(imageURLs instanceof Array)) return

  const results = []

  for (const url of imageURLs) {
    const p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject()
      img.src = url
    })
    results.push(p)
  }

  const images = await Promise.all(results)
  return images
}